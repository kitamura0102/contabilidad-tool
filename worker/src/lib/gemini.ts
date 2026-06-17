import type { ExtractionResult, MultiDetectResult, MultiExtractionResult } from '../types'

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

async function callGemini(
  prompt: string,
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<string> {
  const base64 = arrayBufferToBase64(imageBytes)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          response_mime_type: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini ${response.status}: ${err}`)
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini devolvió respuesta vacía')
  return text
}

// ── Exports ──────────────────────────────────────────────────────────────────

// Extrae una sola factura de una imagen/PDF
export async function extractInvoice(
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<ExtractionResult> {
  const text = await callGemini(SINGLE_PROMPT, imageBytes, mimeType, apiKey, model)
  return JSON.parse(text) as ExtractionResult
}

// Detecta cuántas facturas hay en un archivo (imagen o PDF)
export async function detectInvoiceCount(
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<MultiDetectResult> {
  try {
    const text = await callGemini(MULTI_DETECT_PROMPT, imageBytes, mimeType, apiKey, model)
    // La respuesta puede venir como JSON "1" o como número plano
    let raw = text.trim()
    // Quitar comillas si viene como JSON string
    if (raw.startsWith('"')) raw = raw.slice(1, -1)
    const count = parseInt(raw, 10)
    if (!isFinite(count) || count < 1) return { count: 1, source: 'fallback' }
    return { count, source: 'auto' }
  } catch {
    return { count: 1, source: 'fallback' }
  }
}

// Extrae todas las facturas de un archivo multi-factura
export async function extractMultipleInvoices(
  imageBytes: ArrayBuffer,
  mimeType: string,
  count: number,
  apiKey: string,
  model: string
): Promise<MultiExtractionResult> {
  const text = await callGemini(MULTI_EXTRACT_PROMPT(count), imageBytes, mimeType, apiKey, model)
  const parsed = JSON.parse(text) as MultiExtractionResult

  // Garantizar que el array tenga exactamente `count` elementos
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
