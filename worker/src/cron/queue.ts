import { getDb } from '../lib/db'
import { extractInvoice, extractMultipleInvoices } from '../lib/gemini'
import { extractionToColumns } from '../lib/extraction'
import type { Env, ExtractionResult } from '../types'

const MAX_PER_RUN = 15  // Gemini free tier: 15 RPM
const MAX_RETRIES = 3

export async function processQueue(env: Env): Promise<void> {
  const sql = getDb(env.DATABASE_URL)

  const claimed = await sql`
    UPDATE facturas
    SET estado = 'procesando'
    WHERE id IN (
      SELECT id FROM facturas
      WHERE estado = 'en_cola' AND intentos < ${MAX_RETRIES}
      ORDER BY creado_en
      LIMIT ${MAX_PER_RUN}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, imagen_path, intentos, source_index, source_count
  ` as Array<{ id: string; imagen_path: string; intentos: number; source_index: number | null; source_count: number | null }>

  if (!claimed.length) return

  // Secuencial: una factura a la vez. Evita saturar el rate limit de Gemini
  // (que provoca 429 y reintentos) y hace el procesamiento más predecible.
  for (const f of claimed) {
    await processOne(f, env, sql)
  }
}

async function processOne(
  factura: { id: string; imagen_path: string; intentos: number; source_index: number | null; source_count: number | null },
  env: Env,
  sql: ReturnType<typeof getDb>
): Promise<void> {
  const isMulti = factura.source_index !== null && factura.source_count !== null && factura.source_count > 1

  // Registros con source_index > 0 son procesados en lote por el source_index=0.
  // Si ya están procesados los saltamos; si siguen en cola es que el lote falló,
  // en ese caso los procesamos individualmente como fallback.
  if (isMulti && factura.source_index !== 0) {
    const [row] = await sql`
      SELECT estado FROM facturas WHERE id = ${factura.id}
    ` as Array<{ estado: string }>
    if (row?.estado === 'procesada' || row?.estado === 'pendiente_revision') return
    // Si sigue en cola, continúa con extracción individual (fallback)
  }

  try {
    const obj = await env.R2.get(factura.imagen_path)
    if (!obj) throw new Error('Imagen no encontrada en R2')

    const imageBytes = await obj.arrayBuffer()
    const mimeType = obj.httpMetadata?.contentType ?? 'image/jpeg'

    if (isMulti && factura.source_index === 0) {
      // Una sola llamada Gemini para TODO el lote
      const multi = await extractMultipleInvoices(
        imageBytes,
        mimeType,
        factura.source_count!,
        env.GEMINI_API_KEY,
        env.GEMINI_MODEL
      )

      // Recuperar los IDs de todos los registros hermanos (mismo imagen_path, en orden)
      const siblings = await sql`
        SELECT id, source_index
        FROM facturas
        WHERE imagen_path = ${factura.imagen_path}
          AND source_index IS NOT NULL
        ORDER BY source_index ASC
      ` as Array<{ id: string; source_index: number }>

      // Aplicar cada extracción al registro que le corresponde
      await Promise.all(siblings.map(sib => {
        const extraction = multi.invoices[sib.source_index] ?? multi.invoices[0]
        return applyExtraction(sib.id, extraction, sql)
      }))
    } else {
      // Factura individual (no multi) o fallback
      const extraction = await extractInvoice(imageBytes, mimeType, env.GEMINI_API_KEY, env.GEMINI_MODEL)
      await applyExtraction(factura.id, extraction, sql)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('processOne fallo:', factura.id, msg)

    const isTransient = /429|RESOURCE_EXHAUSTED|quota|503|overloaded|unavailable|rate.?limit/i.test(msg)

    if (isTransient) {
      await sql`
        UPDATE facturas SET estado = 'en_cola', ultimo_error = ${msg}
        WHERE id = ${factura.id}
      `
    } else {
      const nuevoEstado = factura.intentos + 1 >= MAX_RETRIES ? 'error_extraccion' : 'en_cola'
      await sql`
        UPDATE facturas SET
          estado       = ${nuevoEstado},
          intentos     = intentos + 1,
          ultimo_error = ${msg}
        WHERE id = ${factura.id}
      `
    }
  }
}

async function applyExtraction(
  id: string,
  e: ExtractionResult,
  sql: ReturnType<typeof getDb>
): Promise<void> {
  const cols = extractionToColumns(e)

  await sql`
    UPDATE facturas SET
      rnc_emisor               = ${cols.rnc},
      tipo_id                  = ${cols.tipoId},
      ncf                      = ${cols.ncf},
      ncf_modificado           = ${cols.ncfModificado},
      fecha_emision            = ${cols.fechaEmision}::date,
      monto_total_cent         = ${cols.montoTotal},
      monto_itbis_cent         = ${cols.montoItbis},
      tasa_itbis               = ${cols.tasaItbis},
      monto_servicios_cent     = ${cols.montoServicios},
      monto_bienes_cent        = ${cols.montoBienes},
      isc_cent                 = ${cols.isc},
      otros_impuestos_cent     = ${cols.otrosImpuestos},
      propina_cent             = ${cols.propina},
      tipo_ingreso             = ${cols.tipoIngreso},
      forma_pago               = ${cols.formaPago},
      tipo_bs                  = ${cols.tipoBs},
      confidence_json          = ${JSON.stringify(e)}::jsonb,
      estado                   = ${cols.estado},
      intentos                 = intentos + 1,
      ultimo_error             = NULL
    WHERE id = ${id}
  `
}
