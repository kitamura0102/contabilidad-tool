import { getDb, normalizeRnc, toCents } from '../lib/db'
import { extractInvoice } from '../lib/gemini'
import type { Env } from '../types'

const MAX_PER_RUN = 15  // Gemini free tier: 15 RPM
const MAX_RETRIES = 3

export async function processQueue(env: Env): Promise<void> {
  const sql = getDb(env.DATABASE_URL)

  // Tomar hasta MAX_PER_RUN facturas en cola, marcarlas como procesando
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
    RETURNING id, imagen_path, intentos
  ` as Array<{ id: string; imagen_path: string; intentos: number }>

  if (!claimed.length) return

  await Promise.all(claimed.map(f => processOne(f, env, sql)))
}

async function processOne(
  factura: { id: string; imagen_path: string; intentos: number },
  env: Env,
  sql: ReturnType<typeof getDb>
): Promise<void> {
  try {
    const obj = await env.R2.get(factura.imagen_path)
    if (!obj) throw new Error('Imagen no encontrada en R2')

    const imageBytes = await obj.arrayBuffer()
    const mimeType = obj.httpMetadata?.contentType ?? 'image/jpeg'

    const extraction = await extractInvoice(
      imageBytes,
      mimeType,
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL
    )

    const rnc = extraction.rnc_emisor.value
      ? normalizeRnc(extraction.rnc_emisor.value)
      : null

    const montoTotal = extraction.monto_total.value
      ? toCents(extraction.monto_total.value)
      : null

    const montoItbis = extraction.monto_itbis.value
      ? toCents(extraction.monto_itbis.value)
      : null

    const tasaItbis = extraction.tasa_itbis.value
      ? parseInt(extraction.tasa_itbis.value)
      : null

    // Determinar si todos los campos críticos tienen alta confianza
    const hasBadConfidence = [
      extraction.rnc_emisor,
      extraction.ncf,
      extraction.monto_total,
    ].some(f => f.confidence === 'low')

    const nuevoEstado = hasBadConfidence ? 'pendiente_revision' : 'procesada'

    await sql`
      UPDATE facturas SET
        rnc_emisor       = ${rnc},
        ncf              = ${extraction.ncf.value},
        fecha_emision    = ${extraction.fecha_emision.value}::date,
        monto_total_cent = ${montoTotal !== null ? Number(montoTotal) : null},
        monto_itbis_cent = ${montoItbis !== null ? Number(montoItbis) : null},
        tasa_itbis       = ${tasaItbis},
        confidence_json  = ${JSON.stringify(extraction)}::jsonb,
        estado           = ${nuevoEstado},
        intentos         = intentos + 1,
        ultimo_error     = NULL
      WHERE id = ${factura.id}
    `
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('processOne fallo:', factura.id, msg)

    const isTransient = /429|RESOURCE_EXHAUSTED|quota|503|overloaded|unavailable|rate.?limit/i.test(msg)

    if (isTransient) {
      // Error transitorio: vuelve a la cola sin quemar un intento
      await sql`
        UPDATE facturas SET
          estado       = 'en_cola',
          ultimo_error = ${msg}
        WHERE id = ${factura.id}
      `
    } else {
      const nuevoEstado = factura.intentos + 1 >= MAX_RETRIES
        ? 'error_extraccion'
        : 'en_cola'
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
