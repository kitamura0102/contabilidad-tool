export type Factura = {
  id: string
  cliente_id: string
  nombre_empresa?: string
  estado: string
  tipo: string
  // Campos básicos (AI extrae)
  rnc_emisor:         string | null
  tipo_id:            number | null    // 1=RNC 2=Cédula 3=Pasaporte
  ncf:                string | null
  ncf_modificado:     string | null
  fecha_emision:      string | null
  fecha_pago:         string | null
  tipo_bs:            string | null
  tipo_ingreso:       string | null
  forma_pago:         string | null
  monto_total_cent:   number | null
  monto_itbis_cent:   number | null
  tasa_itbis:         number | null
  // Desglose de montos (AI extrae si aparece en factura)
  monto_servicios_cent:  number | null
  monto_bienes_cent:     number | null
  isc_cent:              number | null
  otros_impuestos_cent:  number | null
  propina_cent:          number | null
  // Campos manuales (ITBIS/ISR detalle — el contador llena)
  itbis_retenido_cent:         number | null
  tipo_retencion_isr:          string | null
  monto_retencion_renta_cent:  number | null
  isr_percibido_cent:          number | null
  itbis_proporcionalidad_cent: number | null
  itbis_costo_cent:            number | null
  itbis_adelantar_cent:        number | null
  itbis_percibido_cent:        number | null
  // Meta
  confidence_json:    Record<string, unknown> | null
  ultimo_error:       string | null
  creado_en:          string
  // Multi-factura
  source_index:  number | null
  source_count:  number | null
  // Duplicados
  posible_duplicado_id: string | null
}

export const ESTADOS_LABEL: Record<string, string> = {
  en_cola: 'En cola',
  procesando: 'Procesando',
  procesada: 'Procesada',
  pendiente_revision: 'Revisar',
  error_extraccion: 'Error',
}

export const NECESITA_ATENCION = ['pendiente_revision', 'error_extraccion']

export const TIPO_ID_LABEL: Record<number, string> = { 1: 'RNC', 2: 'Cédula', 3: 'Pasaporte' }
export const TIPO_BS_LABEL: Record<string, string> = { '1': 'Bienes', '2': 'Servicios', '3': 'Mixto' }
export const TIPO_INGRESO_LABEL: Record<string, string> = {
  '1': 'Operaciones locales', '2': 'Exportaciones', '3': 'Regalías',
  '4': 'Intereses', '5': 'Arrendamiento', '6': 'Honorarios',
}
export const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia',
  credito: 'Crédito', cheque: 'Cheque', permuta: 'Permuta',
  bonos: 'Bonos', otros: 'Otros',
}

export function friendlyError(msg: string): string {
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'Límite de la API de IA alcanzado. Reintenta en unos minutos.'
  if (/\b503\b|overloaded|unavailable/i.test(msg)) return 'El servicio de IA estaba saturado. Reintenta.'
  if (/Imagen no encontrada/i.test(msg)) return 'No se encontró la imagen. Vuelve a subirla.'
  if (/JSON|Unexpected|SyntaxError|vac[ií]a/i.test(msg)) return 'La IA no pudo leer la factura. Verifica que la foto sea legible.'
  return 'Error al procesar. Reintenta o corrige los datos a mano.'
}

export const fmtMoney = (cents: number | null) =>
  cents == null ? '—' : 'RD$ ' + (cents / 100).toLocaleString('es-DO', { minimumFractionDigits: 2 })

export const centsToPesos = (cents: number | null): string =>
  cents == null ? '' : (cents / 100).toFixed(2)

export const pesosToCents = (s: string): number | undefined =>
  s.trim() === '' ? undefined : Math.round(parseFloat(s.replace(/,/g, '')) * 100)
