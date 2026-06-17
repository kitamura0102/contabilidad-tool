import { normalizeRnc, toCents } from './db'
import type { ExtractionResult } from '../types'

// Deriva el tipo de identificación a partir de la longitud del RNC/cédula.
export function autoTipoId(rnc: string | null): number | null {
  if (!rnc) return null
  const digits = rnc.replace(/\D/g, '')
  if (digits.length === 9) return 1   // RNC
  if (digits.length === 11) return 2  // Cédula
  return 3                            // Pasaporte / otro
}

// Convierte un ExtractionResult de Gemini en los valores de columna listos para
// INSERT/UPDATE. Lógica pura (sin DB) para que el cron y el upload la compartan.
export function extractionToColumns(e: ExtractionResult) {
  const rnc = e.rnc_emisor.value ? normalizeRnc(e.rnc_emisor.value) : null
  const tipoId = e.tipo_id.value ? parseInt(e.tipo_id.value) : autoTipoId(rnc)
  const toC = (v: string | null) => (v ? Number(toCents(v)) : null)

  // Solo los campos clave definen si necesita revisión manual.
  const hasBadConfidence = [e.rnc_emisor, e.ncf, e.monto_total].some(f => f.confidence === 'low')

  return {
    rnc,
    tipoId,
    ncf:            e.ncf.value,
    ncfModificado:  e.ncf_modificado.value,
    fechaEmision:   e.fecha_emision.value,
    montoTotal:     toC(e.monto_total.value),
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
    estado:         hasBadConfidence ? 'pendiente_revision' : 'procesada',
  }
}
