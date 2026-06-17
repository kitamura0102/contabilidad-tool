import { PDFDocument } from 'pdf-lib'

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
