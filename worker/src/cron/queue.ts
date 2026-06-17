import { getDb } from '../lib/db'
import { extractInvoicesFromPage } from '../lib/gemini'
import { extractionToColumns } from '../lib/extraction'
import type { Env, ExtractionResult } from '../types'

const MAX_PER_RUN = 5   // El PDF ya viene partido en páginas sueltas desde la
                        // subida, así que la cola solo descarga una hoja y la manda
                        // a Claude. Sin pdf-lib en la cola → sin riesgo de CPU.
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

  // Liberar facturas atascadas en 'procesando' por más de 30 minutos.
  // Si un registro ya agotó sus intentos, va a error_extraccion (no vuelve a la
  // cola): un crash duro —p.ej. límite de CPU al extraer una página pesada— mata
  // al worker sin pasar por el catch, así que el conteo de intentos se hace al
  // reclamar (ver abajo). Esto evita que un registro tóxico cicle para siempre.
  await sql`
    UPDATE facturas
    SET estado = CASE WHEN intentos >= ${MAX_RETRIES} THEN 'error_extraccion' ELSE 'en_cola' END,
        ultimo_error = 'Timeout: atascada en procesando por más de 30 minutos'
    WHERE estado = 'procesando'
      AND creado_en < NOW() - INTERVAL '30 minutes'
  `

  // Al reclamar se incrementa intentos de inmediato. Así, aunque el worker muera
  // en seco a la mitad (límite de CPU/memoria) sin llegar al catch, el intento
  // queda contado y el registro no se reintenta infinitamente.
  const claimed = await sql`
    UPDATE facturas
    SET estado = 'procesando', intentos = intentos + 1
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

  for (let i = 0; i < claimed.length; i++) {
    await processOne(claimed[i], env, sql)
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

    // imagen_path ya apunta a una hoja suelta (imagen o PDF de una página): los
    // PDF multipágina se parten al subir. La cola solo descarga y manda a Claude.
    const bytes = await obj.arrayBuffer()
    const mime = obj.httpMetadata?.contentType ?? 'image/jpeg'

    const invoices = await extractInvoicesFromPage(bytes, mime, env.ANTHROPIC_API_KEY, 'claude-haiku-4-5')
    if (invoices.length === 0) {
      throw new Error('No se detectó ninguna factura legible en esta página/foto')
    }

    // La primera factura de la página va a este registro.
    await applyExtraction(factura.id, invoices[0], sql)

    // Si la página traía más de una factura, se crean registros adicionales,
    // todos apuntando a la misma imagen de la página.
    for (let i = 1; i < invoices.length; i++) {
      const [row] = await sql`
        INSERT INTO facturas (cliente_id, imagen_path, tipo, estado)
        VALUES (${factura.cliente_id}::uuid, ${factura.imagen_path}, ${factura.tipo}, 'procesando')
        RETURNING id
      ` as Array<{ id: string }>
      await applyExtraction(row.id, invoices[i], sql)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('processOne fallo:', factura.id, msg)

    // 401/403/authentication = key mal configurada (problema global, no de esta
    // factura): se trata como transitorio para no quemar intentos ni mandar todo
    // el lote a error_extraccion mientras se corrige la API key.
    const isTransient = /401|403|authentication|429|RESOURCE_EXHAUSTED|quota|503|overloaded|unavailable|rate.?limit/i.test(msg)

    // intentos ya se incrementó al reclamar. Un error transitorio (rate limit,
    // sobrecarga) no debe consumir un intento, así que se devuelve.
    if (isTransient) {
      await sql`
        UPDATE facturas SET estado = 'en_cola', intentos = intentos - 1, ultimo_error = ${msg}
        WHERE id = ${factura.id}
      `
    } else {
      // factura.intentos ya refleja el intento actual (incrementado al reclamar).
      const nuevoEstado = factura.intentos >= MAX_RETRIES ? 'error_extraccion' : 'en_cola'
      await sql`
        UPDATE facturas SET estado = ${nuevoEstado}, ultimo_error = ${msg}
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
      ultimo_error             = NULL
    WHERE id = ${id}
  `
}
