import { PDFDocument } from 'pdf-lib'
import { extractText, getDocumentProxy } from 'unpdf'
import { AZUL_RNC } from './gemini'

// ¿El PDF es un estado de cuenta de AZUL (Servicios Digitales Popular)?
// AZUL genera PDFs digitales con texto seleccionable. Se detecta por VARIAS
// señales independientes —principalmente el RNC de AZUL, que es único— para no
// depender de una sola frase exacta que pueda variar entre versiones.
export async function looksLikeAzul(bytes: ArrayBuffer): Promise<boolean> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const { text } = await extractText(pdf, { mergePages: true })
    // El RNC de AZUL, ignorando guiones/espacios (1-31-08355-2 → 131083552).
    const soloDigitos = text.replace(/\D+/g, '')
    return (
      soloDigitos.includes(AZUL_RNC) ||
      /servicios\s+digitales\s+popular/i.test(text) ||
      /comprobante\s+fiscal\s+por\s+cargos/i.test(text) ||
      (/\bazul\b/i.test(text) && /cargos\s*-?\s*comisiones/i.test(text))
    )
  } catch {
    return false
  }
}

// Número de páginas de un PDF. Si no se puede leer, devuelve 1 (lo tratamos como
// un documento de una sola página).
export async function getPageCount(bytes: ArrayBuffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    return doc.getPageCount()
  } catch {
    return 1
  }
}

// Extrae una sola página de un PDF como un PDF nuevo de una página.
export async function extractPage(bytes: ArrayBuffer, index: number): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const out = await PDFDocument.create()
  const [page] = await out.copyPages(src, [index])
  out.addPage(page)
  return out.save()
}
