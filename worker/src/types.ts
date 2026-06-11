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

export type ExtractionResult = {
  rnc_emisor:    { value: string | null; confidence: 'high' | 'medium' | 'low' }
  ncf:           { value: string | null; confidence: 'high' | 'medium' | 'low' }
  fecha_emision: { value: string | null; confidence: 'high' | 'medium' | 'low' }
  monto_total:   { value: string | null; confidence: 'high' | 'medium' | 'low' }
  monto_itbis:   { value: string | null; confidence: 'high' | 'medium' | 'low' }
  tasa_itbis:    { value: '16' | '18' | null; confidence: 'high' | 'medium' | 'low' }
}
