import type { ExtractionResult, MultiDetectResult, MultiExtractionResult } from '../types'

// RNC fijo del emisor de los estados de cuenta AZUL (Servicios Digitales Popular, S.A.)
// En el documento aparece como "1-31-08355-2"; normalizado = 131083552.
export const AZUL_RNC = '131083552'

// ── Prompts ──────────────────────────────────────────────────────────────────

const SINGLE_PROMPT = `Extrae los datos de esta factura dominicana. Devuelve SOLO un JSON válido sin markdown:
{
  "rnc_emisor":      { "value": "101234567", "confidence": "high|medium|low" },
  "ncf":             { "value": "B0100000001 o E310000033552", "confidence": "..." },
  "ncf_modificado":  { "value": null, "confidence": "low" },
  "tipo_id":         { "value": "1", "confidence": "high" },
  "fecha_emision":   { "value": "YYYY-MM-DD", "confidence": "..." },
  "monto_total":     { "value": "5000.00", "confidence": "..." },
  "monto_itbis":     { "value": "762.71", "confidence": "..." },
  "tasa_itbis":      { "value": "16|18|null", "confidence": "..." },
  "monto_servicios": { "value": null, "confidence": "low" },
  "monto_bienes":    { "value": null, "confidence": "low" },
  "isc":             { "value": null, "confidence": "low" },
  "otros_impuestos": { "value": null, "confidence": "low" },
  "propina":         { "value": null, "confidence": "low" },
  "tipo_ingreso":    { "value": "1", "confidence": "high" },
  "forma_pago":      { "value": null, "confidence": "low" },
  "tipo_bs":         { "value": "2", "confidence": "medium" }
}
Reglas:
- rnc_emisor: solo dígitos sin guiones ni espacios (ej: "131789392")
- tipo_id: 1 si rnc_emisor tiene 9 dígitos, 2 si cédula 11 dígitos, 3 si pasaporte
- ncf: formato B+10 dígitos o E+12 dígitos. Si no hay NCF, null
- ncf_modificado: solo si la factura es nota de crédito/débito y referencia una factura anterior
- fecha_emision: formato YYYY-MM-DD
- monto_total: número decimal, total final incluyendo ITBIS
- monto_itbis: número decimal. Si dice ITBIS=0 o exento, "0.00"
- tasa_itbis: "16", "18", o null si exento/no aplica
- monto_servicios / monto_bienes: solo si la factura los desglosa separadamente
- isc: Impuesto Selectivo al Consumo, si aparece explícito
- propina: si aparece propina legal
- forma_pago: "efectivo", "tarjeta", "transferencia", "credito", "cheque" o null
- tipo_bs: "1"=bienes, "2"=servicios, "3"=mixto. Default "2"
- tipo_ingreso: "1" (operaciones locales) por defecto
- Si un campo no es legible: value null, confidence "low"
Solo JSON, sin texto adicional.`

const MULTI_DETECT_PROMPT = `Cuenta cuántas facturas/recibos/comprobantes fiscales distintos hay en esta imagen o documento.
Responde SOLO con un número entero. No incluyas texto adicional.
Ejemplos: si hay 1 factura, responde: 1. Si hay 3 recibos, responde: 3.`

const ANALYZE_PROMPT = `Eres un clasificador de documentos fiscales dominicanos. Revisa TODAS las páginas.

REGLA PRINCIPAL — Estado de cuenta de AZUL / Servicios Digitales Popular:
Es AZUL si el documento contiene CUALQUIERA de estas señales (normalmente en la página 2):
- una tabla titulada "Comprobante fiscal por cargos", o
- varias filas con NCF de formato E + 12 dígitos (ej: E310007609300), o
- el texto "Cargos-Comisiones" o "SERVICIOS DIGITALES POPULAR".
Un estado de cuenta de AZUL es UN SOLO documento con MUCHAS filas; NO lo trates
como muchas facturas genéricas. Si ves esas señales, es "azul" SIEMPRE.

Si es AZUL, responde SOLO con este JSON (una entrada por CADA fila de la tabla
"Comprobante fiscal por cargos"):
{
  "tipo_documento": "azul",
  "facturas": [
    { "ncf": "E310007609300", "fecha_emision": "2026-05-01", "monto_total": "1148.16" }
  ]
}
Reglas AZUL:
- Una entrada por CADA fila que tenga un NCF (E + 12 dígitos). Si hay 15 filas, el array tiene 15.
- ncf: la columna NCF, sin espacios.
- fecha_emision: la PRIMERA columna "Fecha" de la fila, convertida de DD/MM/YYYY a YYYY-MM-DD.
- monto_total: la última columna "Monto (RD$)" de esa fila, solo número con punto decimal, SIN comas de miles.
- NO uses los totales/resúmenes de la página 1 (ventas, depósitos, total transacciones).
- IGNORA "Otros Cargos", "Ajustes / Otros servicios" y "Contracargos".
- NO incluyas la fila de total al final de la tabla.

Solo si el documento NO tiene ninguna señal de AZUL, responde SOLO:
{ "tipo_documento": "generico", "cantidad_facturas": <entero de facturas distintas> }

Responde SOLO JSON válido, sin markdown ni texto adicional.`

const MULTI_EXTRACT_PROMPT = (total: number) => `Este archivo contiene ${total} facturas/recibos.
Extrae los datos de TODAS las facturas. Devuelve SOLO un JSON válido con esta estructura:
{
  "invoices": [
    {
      "rnc_emisor":      { "value": "...", "confidence": "high|medium|low" },
      "ncf":             { "value": "...", "confidence": "..." },
      "ncf_modificado":  { "value": null, "confidence": "low" },
      "tipo_id":         { "value": "1", "confidence": "high" },
      "fecha_emision":   { "value": "YYYY-MM-DD", "confidence": "..." },
      "monto_total":     { "value": "0.00", "confidence": "..." },
      "monto_itbis":     { "value": "0.00", "confidence": "..." },
      "tasa_itbis":      { "value": null, "confidence": "low" },
      "monto_servicios": { "value": null, "confidence": "low" },
      "monto_bienes":    { "value": null, "confidence": "low" },
      "isc":             { "value": null, "confidence": "low" },
      "otros_impuestos": { "value": null, "confidence": "low" },
      "propina":         { "value": null, "confidence": "low" },
      "tipo_ingreso":    { "value": "1", "confidence": "high" },
      "forma_pago":      { "value": null, "confidence": "low" },
      "tipo_bs":         { "value": "2", "confidence": "medium" }
    }
  ]
}
Reglas:
- El array debe tener exactamente ${total} elementos, uno por factura
- rnc_emisor: solo dígitos sin guiones
- tipo_id: 1 si 9 dígitos, 2 si 11 dígitos, 3 si pasaporte
- ncf: formato B+10 o E+12. null si no hay
- fecha_emision: YYYY-MM-DD
- monto_total: total final incluyendo ITBIS
- tasa_itbis: "16", "18", o null
- Ordena las facturas de arriba a abajo, izquierda a derecha
Solo JSON, sin texto adicional.`

// ── Helpers ──────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function buildContentBlock(base64: string, mimeType: string): Record<string, unknown> {
  if (mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    }
  }
  const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const mt = supported.includes(mimeType) ? mimeType : 'image/jpeg'
  return {
    type: 'image',
    source: { type: 'base64', media_type: mt, data: base64 },
  }
}

async function callClaude(
  prompt: string,
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<string> {
  const base64 = arrayBufferToBase64(imageBytes)
  const contentBlock = buildContentBlock(base64, mimeType)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }
  if (mimeType === 'application/pdf') {
    headers['anthropic-beta'] = 'pdfs-2024-09-25'
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude ${response.status}: ${err}`)
  }

  const data = await response.json() as {
    content?: Array<{ type: string; text?: string }>
  }

  const text = data.content?.[0]?.text
  if (!text) throw new Error('Claude devolvió respuesta vacía')

  // Quitar markdown code fences si Claude los incluye
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

// ── Exports ──────────────────────────────────────────────────────────────────

export async function extractInvoice(
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<ExtractionResult> {
  const text = await callClaude(SINGLE_PROMPT, imageBytes, mimeType, apiKey, model)
  return JSON.parse(text) as ExtractionResult
}

export async function detectInvoiceCount(
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<MultiDetectResult> {
  try {
    const text = await callClaude(MULTI_DETECT_PROMPT, imageBytes, mimeType, apiKey, model)
    let raw = text.trim()
    if (raw.startsWith('"')) raw = raw.slice(1, -1)
    const count = parseInt(raw, 10)
    if (!isFinite(count) || count < 1) return { count: 1, source: 'fallback' }
    return { count, source: 'auto' }
  } catch {
    return { count: 1, source: 'fallback' }
  }
}

export type DocumentAnalysis =
  | { kind: 'azul'; invoices: ExtractionResult[] }
  | { kind: 'generic'; count: number; source: 'auto' | 'fallback' }

function azulRowToExtraction(r: { ncf?: string | null; fecha_emision?: string | null; monto_total?: string | null }): ExtractionResult {
  const low = { value: null, confidence: 'low' as const }
  return {
    rnc_emisor:      { value: AZUL_RNC, confidence: 'high' },
    ncf:             { value: r.ncf ?? null, confidence: r.ncf ? 'high' : 'low' },
    ncf_modificado:  low,
    tipo_id:         { value: '1', confidence: 'high' },
    fecha_emision:   { value: r.fecha_emision ?? null, confidence: r.fecha_emision ? 'high' : 'low' },
    monto_total:     { value: r.monto_total ?? null, confidence: r.monto_total ? 'high' : 'low' },
    monto_itbis:     low,
    tasa_itbis:      low,
    monto_servicios: low,
    monto_bienes:    low,
    isc:             low,
    otros_impuestos: low,
    propina:         low,
    tipo_ingreso:    { value: '1', confidence: 'high' },
    forma_pago:      low,
    tipo_bs:         { value: '2', confidence: 'high' },
  }
}

export async function analyzeDocument(
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<DocumentAnalysis> {
  try {
    const text = await callClaude(ANALYZE_PROMPT, imageBytes, mimeType, apiKey, model)
    const parsed = JSON.parse(text) as {
      tipo_documento?: string
      cantidad_facturas?: number
      facturas?: Array<{ ncf?: string | null; fecha_emision?: string | null; monto_total?: string | null }>
    }

    if (parsed.tipo_documento === 'azul' && Array.isArray(parsed.facturas)) {
      const invoices = parsed.facturas
        .filter(r => r.ncf || r.monto_total)
        .map(azulRowToExtraction)
      if (invoices.length > 0) return { kind: 'azul', invoices }
      return { kind: 'generic', count: 1, source: 'fallback' }
    }

    const count = Number(parsed.cantidad_facturas)
    if (!isFinite(count) || count < 1) return { kind: 'generic', count: 1, source: 'fallback' }
    return { kind: 'generic', count: Math.floor(count), source: 'auto' }
  } catch {
    return { kind: 'generic', count: 1, source: 'fallback' }
  }
}

export async function extractMultipleInvoices(
  imageBytes: ArrayBuffer,
  mimeType: string,
  count: number,
  apiKey: string,
  model: string
): Promise<MultiExtractionResult> {
  const text = await callClaude(MULTI_EXTRACT_PROMPT(count), imageBytes, mimeType, apiKey, model)
  const parsed = JSON.parse(text) as MultiExtractionResult

  while (parsed.invoices.length < count) {
    parsed.invoices.push(emptyExtraction())
  }
  parsed.invoices = parsed.invoices.slice(0, count)

  return parsed
}

function emptyExtraction(): ExtractionResult {
  const low = { value: null, confidence: 'low' as const }
  return {
    rnc_emisor:      low,
    ncf:             low,
    ncf_modificado:  low,
    tipo_id:         low,
    fecha_emision:   low,
    monto_total:     low,
    monto_itbis:     low,
    tasa_itbis:      low,
    monto_servicios: low,
    monto_bienes:    low,
    isc:             low,
    otros_impuestos: low,
    propina:         low,
    tipo_ingreso:    { value: '1', confidence: 'high' },
    forma_pago:      low,
    tipo_bs:         { value: '2', confidence: 'medium' },
  }
}

// ── Extracción por página / foto ───────────────────────────────────────────

const PAGE_PROMPT = `Esta imagen es UNA página escaneada o foto. Normalmente trae 1, 2 o 3
facturas/comprobantes fiscales dominicanos distintos (a veces lado a lado o uno
arriba y otro abajo). Pueden estar rotados, ser tickets de caja o facturas digitales.
A VECES es un estado de cuenta o listado con MUCHAS filas fiscales (por ejemplo un
estado de cuenta de tarjetas con una tabla "Comprobante fiscal por cargos"); en ese
caso cada fila con su propio NCF es una factura.

Identifica CADA comprobante fiscal distinto y extrae sus datos. Devuelve SOLO un
JSON válido sin markdown, con un objeto por cada factura:
{
  "invoices": [
    {
      "rnc_emisor":      { "value": "101234567", "confidence": "high|medium|low" },
      "ncf":             { "value": "B0100000001 o E310000000001", "confidence": "..." },
      "ncf_modificado":  { "value": null, "confidence": "low" },
      "tipo_id":         { "value": "1", "confidence": "high" },
      "fecha_emision":   { "value": "YYYY-MM-DD", "confidence": "..." },
      "monto_total":     { "value": "5000.00", "confidence": "..." },
      "monto_itbis":     { "value": "762.71", "confidence": "..." },
      "tasa_itbis":      { "value": "16|18|null", "confidence": "..." },
      "monto_servicios": { "value": null, "confidence": "low" },
      "monto_bienes":    { "value": null, "confidence": "low" },
      "isc":             { "value": null, "confidence": "low" },
      "otros_impuestos": { "value": null, "confidence": "low" },
      "propina":         { "value": null, "confidence": "low" },
      "tipo_ingreso":    { "value": "1", "confidence": "high" },
      "forma_pago":      { "value": null, "confidence": "low" },
      "tipo_bs":         { "value": "2", "confidence": "medium" }
    }
  ]
}
Reglas:
- Un objeto por CADA comprobante con NCF distinto que veas en la página.
- Si es un estado de cuenta/listado con muchas filas, extrae TODAS las filas que
  tengan NCF (pueden ser 10, 15 o más), una por objeto.
- Si las filas comparten un mismo RNC emisor que aparece UNA vez en el encabezado
  o el pie de página, usa ese mismo rnc_emisor para todas las filas.
- Si ves el MISMO NCF dos veces (ej. un ticket de caja y su versión digital de la
  misma compra), inclúyelo UNA sola vez.
- IGNORA lo que no sea comprobante fiscal: códigos QR sueltos, vouchers de tarjeta,
  papeles en blanco, sellos de "PAGADO", totales y resúmenes sin NCF.
- Las facturas rotadas también cuéntalas; léelas en su orientación correcta.
- rnc_emisor: solo dígitos sin guiones ni espacios.
- tipo_id: 1 si RNC (9 dígitos), 2 si cédula (11 dígitos), 3 si pasaporte.
- ncf: formato B+10 dígitos o E+12 dígitos. Si no hay NCF legible, value null.
- fecha_emision: formato YYYY-MM-DD.
- monto_total: total final con ITBIS incluido, número con punto decimal sin comas de miles.
- monto_itbis: si dice exento o ITBIS 0, "0.00".
- tasa_itbis: "16", "18" o null.
- tipo_bs: "1"=bienes, "2"=servicios, "3"=mixto. Default "2".
- Si un campo no es legible: value null, confidence "low".
- Si la página NO tiene ningún comprobante fiscal, responde { "invoices": [] }.
Solo JSON, sin texto adicional.`

function normalizeExtraction(raw: Record<string, unknown>): ExtractionResult {
  const base = emptyExtraction() as unknown as Record<string, { value: string | null; confidence: 'high' | 'medium' | 'low' }>
  for (const key of Object.keys(base)) {
    const field = raw?.[key] as { value?: unknown; confidence?: unknown } | undefined
    if (field && typeof field === 'object' && 'value' in field) {
      const value = field.value == null ? null : String(field.value)
      const confidence = field.confidence === 'high' || field.confidence === 'medium' ? field.confidence : 'low'
      base[key] = { value, confidence }
    }
  }
  return base as unknown as ExtractionResult
}

export async function extractInvoicesFromPage(
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<ExtractionResult[]> {
  const text = await callClaude(PAGE_PROMPT, imageBytes, mimeType, apiKey, model)
  const parsed = JSON.parse(text) as { invoices?: Array<Record<string, unknown>> }
  const arr = Array.isArray(parsed.invoices) ? parsed.invoices : []
  return arr
    .map(normalizeExtraction)
    .filter(e => e.ncf.value || e.monto_total.value || e.rnc_emisor.value)
}
