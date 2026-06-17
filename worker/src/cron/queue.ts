import { getDb } from '../lib/db'
import { extractInvoicesFromPage } from '../lib/gemini'
import { extractionToColumns } from '../lib/extraction'
import { getPageCount, extractPage } from '../lib/pdf'
import type { Env, ExtractionResult } from '../types'

const MAX_PER_RUN = 15  // Gemini free tier: 15 RPM
const MAX_RETRIES = 3

type ClaimedFactura = {
  id: string
  cliente_id: string
  imagen_path: string
  tipo: string | null
  intentos: number
  source_index: number | null
  source_count: number | null
}

export async function processQueue(env: Env): Promise<void> {
  const sql = getDb(env.DATABASE_URL)

  // Liberar facturas atascadas en 'procesando' por más de 10 minutos.
  // Se usa creado_en como proxy ya que no hay updated_at; funciona porque un
  // registro que lleva >10 min en procesando definitivamente está atascado.
  await sql`
    UPDATE facturas
    SET estado = 'en_cola', ultimo_error = 'Timeout: atascada en procesando'
    WHERE estado = 'procesando'
      AND creado_en < NOW() - INTERVAL '10 minutes'
  `

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
    RETURNING id, cliente_id, imagen_path, tipo, intentos, source_index, source_count
  ` as ClaimedFactura[]

  if (!claimed.length) return

  // Secuencial: una factura a la vez. Evita saturar el rate limit de Gemini
  // (que provoca 429 y reintentos) y hace el procesamiento más predecible.
  for (const f of claimed) {
    await processOne(f, env, sql)
  }
}

async function processOne(
  factura: ClaimedFactura,
  env: Env,
  sql: ReturnType<typeof getDb>
): Promise<void> {
  try {
    const obj = await env.R2.get(factura.imagen_path)
    if (!obj) throw new Error('Imagen no encontrada en R2')

    let bytes = await obj.arrayBuffer()
    let mime = obj.httpMetadata?.contentType ?? 'image/jpeg'
    // displayKey: el objeto R2 que se mostrará para esta factura (la página suelta).
    let displayKey = factura.imagen_path

    // PDF multipágina: extraer SOLO la página que le toca a este registro.
    // (Si el objeto ya es una página suelta —reintento— se usa tal cual.)
    if (factura.source_count && factura.source_count > 1 && factura.source_index != null) {
      const pageCount = await getPageCount(bytes)
      if (pageCount > 1 && factura.source_index < pageCount) {
        const pageBytes = await extractPage(bytes, factura.source_index)
        const pageKey = `${factura.imagen_path}_p${factura.source_index}.pdf`
        await env.R2.put(pageKey, pageBytes, { httpMetadata: { contentType: 'application/pdf' } })
        bytes = pageBytes.slice().buffer
        mime = 'application/pdf'
        displayKey = pageKey
      }
    }

    const invoices = await extractInvoicesFromPage(bytes, mime, env.GEMINI_API_KEY, env.GEMINI_MODEL)
    if (invoices.length === 0) {
      throw new Error('No se detectó ninguna factura legible en esta página/foto')
    }

    // La primera factura de la página va a este registro.
    await applyExtraction(factura.id, invoices[0], sql)
    if (displayKey !== factura.imagen_path) {
      await sql`UPDATE facturas SET imagen_path = ${displayKey} WHERE id = ${factura.id}`
    }

    // Si la página traía más de una factura, se crean registros adicionales,
    // todos apuntando a la misma imagen de la página.
    for (let i = 1; i < invoices.length; i++) {
      const [row] = await sql`
        INSERT INTO facturas (cliente_id, imagen_path, tipo, estado)
        VALUES (${factura.cliente_id}::uuid, ${displayKey}, ${factura.tipo}, 'procesando')
        RETURNING id
      ` as Array<{ id: string }>
      await applyExtraction(row.id, invoices[i], sql)
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
