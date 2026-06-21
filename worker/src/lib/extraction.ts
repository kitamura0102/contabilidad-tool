import { normalizeRnc, toCents, fromCents } from './db'
import type { ExtractionResult } from '../types'

// Deriva el tipo de identificación a partir de la longitud del RNC/cédula.
export function autoTipoId(rnc: string | null): number | null {
  if (!rnc) return null
  const digits = rnc.replace(/\D/g, '')
  if (digits.length === 9) return 1   // RNC
  if (digits.length === 11) return 2  // Cédula
  return 3                            // Pasaporte / otro
}

// ── Validación aritmética ──────────────────────────────────────────────────
// El OCR puede leer mal un dígito (p.ej. 1,256 → 1,258) y reportarlo con
// confianza alta. Cruzamos los montos entre sí: una factura cuadra cuando
// subtotal + ITBIS + propina + ISC + otros = total, y el ITBIS = tasa × base.
// Si no cuadra, marcamos la factura para revisión con el detalle del descuadre.

export type ValidacionAviso = { campo: string; mensaje: string }
export type Validacion = { ok: boolean; warnings: ValidacionAviso[] }

// Tolerancia: las facturas cuadran al centavo, pero dejamos holgura para
// redondeos menores. RD$1.00 atrapa errores de ≥2 pesos sin ruido por centavos.
const TOLERANCIA_CENT = 100

const peso = (cents: number) => 'RD$ ' + fromCents(BigInt(cents))

export function reconciliar(e: ExtractionResult): Validacion {
  const warnings: ValidacionAviso[] = []
  const cent = (v: string | null) => (v ? Number(toCents(v)) : null)

  const total    = cent(e.monto_total.value)
  const subtotal = cent(e.monto_subtotal.value)
  const itbis    = cent(e.monto_itbis.value)
  const isc      = cent(e.isc.value) ?? 0
  const otros    = cent(e.otros_impuestos.value) ?? 0
  const propina  = cent(e.propina.value) ?? 0
  const tasa     = e.tasa_itbis.value ? parseInt(e.tasa_itbis.value) : null

  // 1) Cuadre de la suma: subtotal + ITBIS + propina + ISC + otros = total.
  //    Solo si tenemos base (subtotal) y total para comparar.
  if (total != null && subtotal != null) {
    const esperado = subtotal + (itbis ?? 0) + propina + isc + otros
    const dif = Math.abs(total - esperado)
    if (dif > TOLERANCIA_CENT) {
      warnings.push({
        campo: 'monto_total',
        mensaje: `El total (${peso(total)}) no cuadra con subtotal + ITBIS + extras (${peso(esperado)}). Diferencia de ${peso(dif)}.`,
      })
    }
  }

  // 2) Cuadre del ITBIS contra la tasa: ITBIS ≈ base × tasa%.
  if (itbis != null && subtotal != null && tasa) {
    const esperado = Math.round(subtotal * (tasa / 100))
    const dif = Math.abs(itbis - esperado)
    if (dif > TOLERANCIA_CENT) {
      warnings.push({
        campo: 'monto_itbis',
        mensaje: `El ITBIS (${peso(itbis)}) no coincide con ${tasa}% del subtotal (esperado ${peso(esperado)}).`,
      })
    }
  }

  return { ok: warnings.length === 0, warnings }
}

// Convierte un ExtractionResult de Gemini en los valores de columna listos para
// INSERT/UPDATE. Lógica pura (sin DB) para que el cron y el upload la compartan.
export function extractionToColumns(e: ExtractionResult) {
  const rnc = e.rnc_emisor.value ? normalizeRnc(e.rnc_emisor.value) : null
  const tipoId = e.tipo_id.value ? parseInt(e.tipo_id.value) : autoTipoId(rnc)
  const toC = (v: string | null) => (v ? Number(toCents(v)) : null)

  // Solo los campos clave definen si necesita revisión manual.
  const hasBadConfidence = [e.rnc_emisor, e.ncf, e.monto_total].some(f => f.confidence === 'low')

  // Cruce aritmético de montos: atrapa dígitos mal leídos que el OCR reportó
  // con confianza alta (p.ej. un total de 1,258 cuando era 1,256).
  const validacion = reconciliar(e)

  return {
    rnc,
    tipoId,
    ncf:            e.ncf.value,
    ncfModificado:  e.ncf_modificado.value,
    fechaEmision:   e.fecha_emision.value,
    montoTotal:     toC(e.monto_total.value),
    montoSubtotal:  toC(e.monto_subtotal.value),
    montoItbis:     toC(e.monto_itbis.value),
    tasaItbis:      e.tasa_itbis.value ? parseInt(e.tasa_itbis.value) : null,
    montoServicios: toC(e.monto_servicios.value),
    montoBienes:    toC(e.monto_bienes.value),
    isc:            toC(e.isc.value),
    otrosImpuestos: toC(e.otros_impuestos.value),
    propina:        toC(e.propina.value),
    tipoIngreso:    e.tipo_ingreso.value ?? '1',
    formaPago:      e.forma_pago.value,
    tipoBs:         e.tipo_bs.value ?? '2',
    estado:         (hasBadConfidence || !validacion.ok) ? 'pendiente_revision' : 'procesada',
    // null cuando todo cuadra, para no guardar ruido en la columna.
    validacion:     validacion.ok ? null : validacion,
  }
}
