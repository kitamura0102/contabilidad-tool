export type Factura = {
  id: string
  cliente_id: string
  nombre_empresa?: string        // viene del JOIN en GET /api/facturas
  estado: string
  tipo: string
  rnc_emisor: string | null
  ncf: string | null
  fecha_emision: string | null
  monto_total_cent: number | null
  monto_itbis_cent: number | null
  tasa_itbis: number | null
  confidence_json: Record<string, unknown> | null
  ultimo_error: string | null
  creado_en: string
}

export const ESTADOS_LABEL: Record<string, string> = {
  en_cola: 'En cola',
  procesando: 'Procesando',
  procesada: 'Procesada',
  pendiente_revision: 'Revisar',
  error_extraccion: 'Error',
}

// Una factura "necesita atención" si está pendiente de revisión o falló.
export const NECESITA_ATENCION = ['pendiente_revision', 'error_extraccion']

export function friendlyError(msg: string): string {
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'Límite de la API de IA alcanzado. Reintenta en unos minutos.'
  if (/\b503\b|overloaded|unavailable/i.test(msg)) return 'El servicio de IA estaba saturado. Reintenta.'
  if (/Imagen no encontrada/i.test(msg)) return 'No se encontró la imagen. Vuelve a subirla.'
  if (/JSON|Unexpected|SyntaxError|vac[ií]a/i.test(msg)) return 'La IA no pudo leer la factura. Verifica que la foto sea legible.'
  return 'Error al procesar. Reintenta o corrige los datos a mano.'
}

export const fmtMoney = (cents: number | null) =>
  cents == null ? '—' : 'RD$ ' + (cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })
