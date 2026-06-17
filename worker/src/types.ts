export type Env = {
  DATABASE_URL: string
  GEMINI_API_KEY: string
  GEMINI_MODEL: string
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
  R2: R2Bucket
  R2_PUBLIC_URL: string
}

export type Variables = {
  userId: string
  contadorId: string
}

export type FacturaEstado =
  | 'en_cola'
  | 'procesando'
  | 'procesada'
  | 'pendiente_revision'
  | 'error_extraccion'

// Un campo extraído con nivel de confianza
type Campo<T = string> = { value: T | null; confidence: 'high' | 'medium' | 'low' }

export type ExtractionResult = {
  rnc_emisor:         Campo
  ncf:                Campo
  ncf_modificado:     Campo      // para notas de crédito/débito
  tipo_id:            Campo<'1' | '2' | '3'>  // 1=RNC 2=Cédula 3=Pasaporte
  fecha_emision:      Campo
  monto_total:        Campo
  monto_itbis:        Campo
  tasa_itbis:         Campo<'16' | '18'>
  monto_servicios:    Campo      // desglose servicios
  monto_bienes:       Campo      // desglose bienes
  isc:                Campo      // Impuesto Selectivo al Consumo
  otros_impuestos:    Campo
  propina:            Campo
  tipo_ingreso:       Campo      // 607: tipo de ingreso
  forma_pago:         Campo
  tipo_bs:            Campo      // tipo bienes/servicios comprados
}

// Resultado de detección de múltiples facturas en un archivo
export type MultiDetectResult = {
  count: number          // cuántas facturas hay en el archivo
  source: 'auto' | 'fallback'  // auto=Gemini lo detectó, fallback=asumimos 1
}

// Resultado de extracción múltiple (PDF/foto con N facturas)
export type MultiExtractionResult = {
  invoices: ExtractionResult[]
}
