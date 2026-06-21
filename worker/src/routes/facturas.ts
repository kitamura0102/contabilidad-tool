import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb, normalizeRnc } from '../lib/db'
import { analyzeDocument, detectInvoiceCount } from '../lib/gemini'
import { extractionToColumns } from '../lib/extraction'
import { getPageCount, looksLikeAzul, splitPdfPages } from '../lib/pdf'
import { processQueue } from '../cron/queue'
import { requireAuth } from '../middleware/auth'
import type { Env, Variables } from '../types'

export const facturas = new Hono<{ Bindings: Env; Variables: Variables }>()

facturas.use('*', requireAuth)

// GET /api/facturas?cliente_id=&estado=&tipo=&limit=
facturas.get('/', async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const { cliente_id, estado, tipo, limit: limitParam } = c.req.query()
  const limit = Math.min(Math.max(parseInt(limitParam ?? '100', 10) || 100, 1), 2000)
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      SELECT f.*, c.nombre_empresa
      FROM facturas f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE c.contador_id = ${contadorId}::uuid
        AND (${cliente_id ?? null}::uuid IS NULL OR f.cliente_id = ${cliente_id ?? null}::uuid)
        AND (${estado ?? null}::text IS NULL OR f.estado = ${estado ?? null}::text)
        AND (${tipo ?? null}::text IS NULL OR f.tipo = ${tipo ?? null}::text)
      ORDER BY f.creado_en DESC, f.source_index ASC NULLS LAST
      LIMIT ${limit}
    `,
  ] as Parameters<typeof sql.transaction>[0])

  return c.json((rows as unknown[][])[1])
})

// GET /api/facturas/:id
facturas.get('/:id', async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      SELECT f.*
      FROM facturas f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE f.id = ${c.req.param('id')}
        AND c.contador_id = ${contadorId}::uuid
    `,
  ] as Parameters<typeof sql.transaction>[0])

  const data = ((rows as unknown[][])[1] as unknown[])[0]
  if (!data) return c.json({ error: 'No encontrada' }, 404)
  return c.json(data)
})

// POST /api/facturas — upload + detección multi-factura + duplicados
// Recibe multipart/form-data: file, cliente_id, tipo, [force_count]
facturas.post('/', async (c) => {
  const userId = c.get('userId')
  const formData = await c.req.formData()

  const file = formData.get('file') as File | null
  const clienteId = formData.get('cliente_id') as string | null
  const tipo = (formData.get('tipo') as string | null) ?? 'compra'

  if (!file || !clienteId) {
    return c.json({ error: 'Faltan file y cliente_id' }, 400)
  }

  const isPdf = file.type === 'application/pdf'
  const ext = isPdf ? 'pdf' : 'webp'
  const key = `${userId}/${clienteId}/${Date.now()}.${ext}`

  await c.env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  const sql = getDb(c.env.DATABASE_URL)
  const createdRows: unknown[] = []
  // Timestamp compartido por todo el lote: así las filas de un mismo archivo
  // quedan juntas y se ordenan por source_index (#1, #2, …) en vez de al revés.
  const batchTime = new Date().toISOString()

  const fileBytes = await file.arrayBuffer()

  if (isPdf) {
    const pageCount = await getPageCount(fileBytes)

    // AZUL se detecta por CONTENIDO (es un PDF digital con texto y marcadores
    // propios), no por número de páginas. Un PDF de fotos escaneadas nunca lo es.
    if (await looksLikeAzul(fileBytes)) {
      const analysis = await analyzeDocument(fileBytes, file.type, c.env.ANTHROPIC_API_KEY, 'claude-haiku-4-5')
      if (analysis.kind === 'azul') {
        // Cada fila de "Comprobante fiscal por cargos" se crea ya procesada.
        const total = analysis.invoices.length
        for (let i = 0; i < total; i++) {
          const cols = extractionToColumns(analysis.invoices[i])
          const rows = await sql.transaction([
            sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
            sql`
              INSERT INTO facturas (
                cliente_id, imagen_path, tipo, estado,
                rnc_emisor, tipo_id, ncf, ncf_modificado, fecha_emision,
                monto_total_cent, monto_subtotal_cent, monto_itbis_cent, tasa_itbis,
                monto_servicios_cent, monto_bienes_cent, isc_cent, otros_impuestos_cent, propina_cent,
                tipo_ingreso, forma_pago, tipo_bs,
                confidence_json, validacion_json, source_index, source_count, creado_en
              )
              VALUES (
                ${clienteId}::uuid, ${key}, ${tipo}, ${cols.estado},
                ${cols.rnc}, ${cols.tipoId}, ${cols.ncf}, ${cols.ncfModificado}, ${cols.fechaEmision}::date,
                ${cols.montoTotal}, ${cols.montoSubtotal}, ${cols.montoItbis}, ${cols.tasaItbis},
                ${cols.montoServicios}, ${cols.montoBienes}, ${cols.isc}, ${cols.otrosImpuestos}, ${cols.propina},
                ${cols.tipoIngreso}, ${cols.formaPago}, ${cols.tipoBs},
                ${JSON.stringify(analysis.invoices[i])}::jsonb,
                ${cols.validacion ? JSON.stringify(cols.validacion) : null}::jsonb,
                ${total > 1 ? i : null}, ${total > 1 ? total : null}, ${batchTime}::timestamptz
              )
              RETURNING *
            `,
          ] as Parameters<typeof sql.transaction>[0])
          createdRows.push(((rows as unknown[][])[1] as unknown[])[0])
        }
        return c.json({ facturas: createdRows, detected_count: total, detection_source: 'auto', documento: 'azul' }, 201)
      }
    }

    // PDF normal (corto no-AZUL o largo y desordenado): una página = un registro.
    // Se parte el PDF UNA sola vez aquí y cada página se guarda como su propio
    // objeto en R2. Así la cola solo descarga una hoja y la manda a Claude, sin
    // tocar pdf-lib (que cargaba el PDF entero por página y reventaba el CPU).
    if (pageCount > 1) {
      const pages = await splitPdfPages(fileBytes)
      for (let i = 0; i < pages.length; i++) {
        const pageKey = `${key}_p${i}.pdf`
        await c.env.R2.put(pageKey, pages[i], { httpMetadata: { contentType: 'application/pdf' } })
        createdRows.push(await insertStub(sql, userId, clienteId, pageKey, tipo, i, pages.length, batchTime))
      }
    } else {
      createdRows.push(await insertStub(sql, userId, clienteId, key, tipo, 0, 1, batchTime))
    }
  } else {
    // Imagen / foto: un solo registro; la cola detecta 1-3 facturas dentro.
    createdRows.push(await insertStub(sql, userId, clienteId, key, tipo, 0, 1, batchTime))
  }

  // Arranca el procesamiento ya, sin esperar al cron (que es la red de seguridad).
  c.executionCtx.waitUntil(processQueue(c.env))
  return c.json({ facturas: createdRows, detected_count: createdRows.length, detection_source: 'auto' }, 201)
})

// POST /api/facturas/detect — solo detecta el conteo sin crear registros
// Útil para el frontend: "¿cuántas facturas hay en esta foto?"
facturas.post('/detect', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'Falta file' }, 400)

  const fileBytes = await file.arrayBuffer()
  const detected = await detectInvoiceCount(fileBytes, file.type, c.env.ANTHROPIC_API_KEY, 'claude-haiku-4-5')
  return c.json(detected)
})

const correctSchema = z.object({
  // Campos básicos
  rnc_emisor:           z.string().optional(),
  tipo_id:              z.number().int().min(1).max(3).optional(),
  ncf:                  z.string().optional(),
  ncf_modificado:       z.string().optional(),
  fecha_emision:        z.string().optional(),
  fecha_pago:           z.string().optional(),
  tipo_bs:              z.string().optional(),
  tipo_ingreso:         z.string().optional(),
  forma_pago:           z.string().optional(),
  // Montos (en pesos decimales desde el frontend, convertidos a cents aquí)
  monto_total_cent:         z.number().int().optional(),
  monto_subtotal_cent:      z.number().int().optional(),
  monto_itbis_cent:         z.number().int().optional(),
  tasa_itbis:               z.union([z.literal(16), z.literal(18)]).optional(),
  monto_servicios_cent:     z.number().int().optional(),
  monto_bienes_cent:        z.number().int().optional(),
  isc_cent:                 z.number().int().optional(),
  otros_impuestos_cent:     z.number().int().optional(),
  propina_cent:             z.number().int().optional(),
  // Campos manuales (ITBIS/ISR detalle)
  itbis_retenido_cent:         z.number().int().optional(),
  tipo_retencion_isr:          z.string().optional(),
  monto_retencion_renta_cent:  z.number().int().optional(),
  isr_percibido_cent:          z.number().int().optional(),
  itbis_proporcionalidad_cent: z.number().int().optional(),
  itbis_costo_cent:            z.number().int().optional(),
  itbis_adelantar_cent:        z.number().int().optional(),
  itbis_percibido_cent:        z.number().int().optional(),
})

// PATCH /api/facturas/:id — corrección manual de campos
facturas.patch('/:id', zValidator('json', correctSchema), async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const body = c.req.valid('json')
  const sql = getDb(c.env.DATABASE_URL)

  const rnc = body.rnc_emisor ? normalizeRnc(body.rnc_emisor) : null

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      UPDATE facturas SET
        rnc_emisor                   = COALESCE(${rnc}, rnc_emisor),
        tipo_id                      = COALESCE(${body.tipo_id ?? null}, tipo_id),
        ncf                          = COALESCE(${body.ncf ?? null}, ncf),
        ncf_modificado               = COALESCE(${body.ncf_modificado ?? null}, ncf_modificado),
        fecha_emision                = COALESCE(${body.fecha_emision ?? null}::date, fecha_emision),
        fecha_pago                   = COALESCE(${body.fecha_pago ?? null}::date, fecha_pago),
        tipo_bs                      = COALESCE(${body.tipo_bs ?? null}, tipo_bs),
        tipo_ingreso                 = COALESCE(${body.tipo_ingreso ?? null}, tipo_ingreso),
        forma_pago                   = COALESCE(${body.forma_pago ?? null}, forma_pago),
        monto_total_cent             = COALESCE(${body.monto_total_cent ?? null}, monto_total_cent),
        monto_subtotal_cent          = COALESCE(${body.monto_subtotal_cent ?? null}, monto_subtotal_cent),
        monto_itbis_cent             = COALESCE(${body.monto_itbis_cent ?? null}, monto_itbis_cent),
        tasa_itbis                   = COALESCE(${body.tasa_itbis ?? null}, tasa_itbis),
        monto_servicios_cent         = COALESCE(${body.monto_servicios_cent ?? null}, monto_servicios_cent),
        monto_bienes_cent            = COALESCE(${body.monto_bienes_cent ?? null}, monto_bienes_cent),
        isc_cent                     = COALESCE(${body.isc_cent ?? null}, isc_cent),
        otros_impuestos_cent         = COALESCE(${body.otros_impuestos_cent ?? null}, otros_impuestos_cent),
        propina_cent                 = COALESCE(${body.propina_cent ?? null}, propina_cent),
        itbis_retenido_cent          = COALESCE(${body.itbis_retenido_cent ?? null}, itbis_retenido_cent),
        tipo_retencion_isr           = COALESCE(${body.tipo_retencion_isr ?? null}, tipo_retencion_isr),
        monto_retencion_renta_cent   = COALESCE(${body.monto_retencion_renta_cent ?? null}, monto_retencion_renta_cent),
        isr_percibido_cent           = COALESCE(${body.isr_percibido_cent ?? null}, isr_percibido_cent),
        itbis_proporcionalidad_cent  = COALESCE(${body.itbis_proporcionalidad_cent ?? null}, itbis_proporcionalidad_cent),
        itbis_costo_cent             = COALESCE(${body.itbis_costo_cent ?? null}, itbis_costo_cent),
        itbis_adelantar_cent         = COALESCE(${body.itbis_adelantar_cent ?? null}, itbis_adelantar_cent),
        itbis_percibido_cent         = COALESCE(${body.itbis_percibido_cent ?? null}, itbis_percibido_cent),
        estado                       = 'procesada',
        validacion_json              = NULL,
        revisado_en                  = NOW()
      WHERE id = ${c.req.param('id')}
        AND cliente_id IN (SELECT id FROM clientes WHERE contador_id = ${contadorId}::uuid)
      RETURNING *
    `,
  ] as Parameters<typeof sql.transaction>[0])

  const updated = ((rows as unknown[][])[1] as unknown[])[0]

  // Detección de duplicados tras guardar
  const factura = updated as { id: string; cliente_id: string; ncf: string | null; rnc_emisor: string | null; monto_total_cent: number | null; fecha_emision: string | null }
  const duplicado = await findDuplicate(factura, sql)

  return c.json({ ...updated as object, posible_duplicado: duplicado })
})

// POST /api/facturas/:id/reintentar
facturas.post('/:id/reintentar', async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      UPDATE facturas SET
        estado       = 'en_cola',
        intentos     = 0,
        ultimo_error = NULL
      WHERE id = ${c.req.param('id')}
        AND cliente_id IN (SELECT id FROM clientes WHERE contador_id = ${contadorId}::uuid)
      RETURNING id
    `,
  ] as Parameters<typeof sql.transaction>[0])

  const data = ((rows as unknown[][])[1] as unknown[])[0]
  if (!data) return c.json({ error: 'No encontrada o no está en error' }, 404)
  return c.json({ ok: true })
})

// DELETE /api/facturas/:id
facturas.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      DELETE FROM facturas
      WHERE id = ${c.req.param('id')}
        AND cliente_id IN (SELECT id FROM clientes WHERE contador_id = ${contadorId}::uuid)
      RETURNING imagen_path
    `,
  ] as Parameters<typeof sql.transaction>[0])

  const row = (((rows as unknown[][])[1]) as Array<{ imagen_path: string | null }>)[0]
  if (!row) return c.json({ error: 'No encontrada' }, 404)

  if (row.imagen_path) {
    try { await c.env.R2.delete(row.imagen_path) } catch { /* best-effort */ }
  }
  return c.json({ ok: true })
})

// GET /api/facturas/:id/imagen
facturas.get('/:id/imagen', async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      SELECT f.imagen_path
      FROM facturas f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE f.id = ${c.req.param('id')}
        AND c.contador_id = ${contadorId}::uuid
    `,
  ] as Parameters<typeof sql.transaction>[0])

  const row = (((rows as unknown[][])[1]) as Array<{ imagen_path: string }>)[0]
  if (!row) return c.json({ error: 'No encontrada' }, 404)

  const obj = await c.env.R2.get(row.imagen_path)
  if (!obj) return c.json({ error: 'Imagen no encontrada' }, 404)

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  return new Response(obj.body, { headers })
})

// Crea un registro vacío "en_cola" para que la cola lo procese más tarde.
async function insertStub(
  sql: ReturnType<typeof getDb>,
  userId: string,
  clienteId: string,
  key: string,
  tipo: string,
  index: number,
  count: number,
  batchTime: string,
): Promise<unknown> {
  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      INSERT INTO facturas (cliente_id, imagen_path, tipo, source_index, source_count, creado_en)
      VALUES (
        ${clienteId}::uuid,
        ${key},
        ${tipo},
        ${count > 1 ? index : null},
        ${count > 1 ? count : null},
        ${batchTime}::timestamptz
      )
      RETURNING *
    `,
  ] as Parameters<typeof sql.transaction>[0])
  return ((rows as unknown[][])[1] as unknown[])[0]
}

// ── Duplicate detection helper ────────────────────────────────────────────────

async function findDuplicate(
  f: { id: string; cliente_id: string; ncf: string | null; rnc_emisor: string | null; monto_total_cent: number | null; fecha_emision: string | null },
  sql: ReturnType<typeof getDb>
): Promise<{ id: string; ncf: string | null; fecha_emision: string | null } | null> {
  if (!f.ncf && !f.rnc_emisor) return null

  // Buscar por NCF exacto primero (más confiable)
  if (f.ncf) {
    const byNcf = await sql`
      SELECT id, ncf, fecha_emision
      FROM facturas
      WHERE cliente_id = ${f.cliente_id}::uuid
        AND id != ${f.id}
        AND ncf = ${f.ncf}
      LIMIT 1
    ` as Array<{ id: string; ncf: string; fecha_emision: string }>
    if (byNcf.length > 0) return byNcf[0]
  }

  // Buscar por RNC + monto + fecha (±3 días) — captura errores de OCR en NCF
  if (f.rnc_emisor && f.monto_total_cent && f.fecha_emision) {
    const byFields = await sql`
      SELECT id, ncf, fecha_emision
      FROM facturas
      WHERE cliente_id = ${f.cliente_id}::uuid
        AND id != ${f.id}
        AND rnc_emisor = ${f.rnc_emisor}
        AND monto_total_cent = ${f.monto_total_cent}
        AND ABS(fecha_emision - ${f.fecha_emision}::date) <= 3
      LIMIT 1
    ` as Array<{ id: string; ncf: string; fecha_emision: string }>
    if (byFields.length > 0) return byFields[0]
  }

  return null
}
