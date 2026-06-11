import type { ExtractionResult } from '../types'

const PROMPT = `Extrae de esta factura dominicana y devuelve SOLO un JSON válido sin markdown:
{
  "rnc_emisor":    { "value": "101234567", "confidence": "high|medium|low" },
  "ncf":           { "value": "B0100000001 o E310000033552", "confidence": "..." },
  "fecha_emision": { "value": "YYYY-MM-DD", "confidence": "..." },
  "monto_total":   { "value": "5000.00", "confidence": "..." },
  "monto_itbis":   { "value": "762.71", "confidence": "..." },
  "tasa_itbis":    { "value": "16|18", "confidence": "..." }
}
Reglas:
- rnc_emisor: solo dígitos, sin guiones (ej: "131789392" no "1-31-78939-2")
- ncf: formato B+10 dígitos o E+12 dígitos
- monto_total: total final incluyendo ITBIS
- Si un campo no es legible: value null, confidence "low"
Solo JSON, sin texto adicional.`

export async function extractInvoice(
  imageBytes: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<ExtractionResult> {
  const base64 = arrayBufferToBase64(imageBytes)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
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

  const parsed = JSON.parse(text) as ExtractionResult
  return parsed
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
