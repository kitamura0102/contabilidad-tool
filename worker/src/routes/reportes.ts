import { Hono } from 'hono'
import { getDb, fromCents } from '../lib/db'
import { buildXlsx, type Cell } from '../lib/xlsx'
import { requireAuth } from '../middleware/auth'
import type { Env, Variables } from '../types'

export const reportes = new Hono<{ Bindings: Env; Variables: Variables }>()

reportes.use('*', requireAuth)

type FacturaRow = {
  rnc_emisor: string | null
  ncf: string | null
  fecha_emision: string | null
  monto_total_cent: number | null
  monto_itbis_cent: number | null
  tasa_itbis: number | null
  tipo_bs: string | null
  forma_pago: string | null
  tipo: string
}

// GET /api/reportes/:clienteId/:tipo/:periodo[?formato=txt|xlsx]
// tipo: 606 | 607   periodo: YYYYMM
// formato=txt (por defecto): archivo oficial pipe-delimitado para la DGII
// formato=xlsx: hoja Excel legible para revisión/respaldo del contador
reportes.get('/:clienteId/:tipo/:periodo', async (c) => {
  const userId = c.get('userId')
  const { clienteId, tipo, periodo } = c.req.param()
  const formato = c.req.query('formato') === 'xlsx' ? 'xlsx' : 'txt'

  if (!['606', '607'].includes(tipo)) {
    return c.json({ error: 'Tipo debe ser 606 o 607' }, 400)
  }
  if (!/^\d{6}$/.test(periodo)) {
    return c.json({ error: 'Periodo debe ser YYYYMM' }, 400)
  }

  const year = periodo.slice(0, 4)
  const month = periodo.slice(4, 6)
  const tipoFactura = tipo === '606' ? 'compra' : 'venta'

  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      SELECT f.*, c.rnc AS rnc_cliente, c.nombre_empresa
      FROM facturas f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE f.cliente_id = ${clienteId}::uuid
        AND f.estado = 'procesada'
        AND f.tipo = ${tipoFactura}
        AND EXTRACT(YEAR  FROM f.fecha_emision) = ${year}::int
        AND EXTRACT(MONTH FROM f.fecha_emision) = ${month}::int
      ORDER BY f.fecha_emision
    `,
  ] as Parameters<typeof sql.transaction>[0])

  const facturas = (rows as unknown[][])[1] as FacturaRow[]

  if (formato === 'xlsx') {
    const xlsx = tipo === '606' ? excel606(facturas) : excel607(facturas)
    return new Response(xlsx, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${tipo}_${periodo}.xlsx"`,
      },
    })
  }

  const txt = tipo === '606'
    ? build606(facturas)
    : build607(facturas)

  return new Response(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tipo}_${periodo}.txt"`,
    },
  })
})

// Monto en pesos (número) para celdas Excel. null → 0.
function montoPesos(cents: number | null): number {
  return cents === null ? 0 : Number(cents) / 100
}

// 606 — versión Excel legible (encabezados + fila de totales)
function excel606(rows: FacturaRow[]): Uint8Array {
  const headers = ['#', 'RNC Proveedor', 'NCF', 'Tipo B/S', 'Fecha', 'Monto facturado', 'ITBIS facturado', 'Forma pago']
  const body: Cell[][] = rows.map((f, i) => [
    i + 1,
    f.rnc_emisor ?? '',
    f.ncf ?? '',
    f.tipo_bs ?? '',
    formatFecha(f.fecha_emision),
    montoPesos(f.monto_total_cent),
    montoPesos(f.monto_itbis_cent),
    f.forma_pago ?? '',
  ])
  const totMonto = rows.reduce((s, f) => s + montoPesos(f.monto_total_cent), 0)
  const totItbis = rows.reduce((s, f) => s + montoPesos(f.monto_itbis_cent), 0)
  const total: Cell[] = ['', 'TOTALES', '', '', '', totMonto, totItbis, '']
  return buildXlsx('606', [headers, ...body, total])
}

// 607 — versión Excel legible (encabezados + fila de totales)
function excel607(rows: FacturaRow[]): Uint8Array {
  const headers = ['#', 'RNC Comprador', 'NCF', 'Fecha', 'Monto facturado', 'ITBIS facturado']
  const body: Cell[][] = rows.map((f, i) => [
    i + 1,
    f.rnc_emisor ?? '',
    f.ncf ?? '',
    formatFecha(f.fecha_emision),
    montoPesos(f.monto_total_cent),
    montoPesos(f.monto_itbis_cent),
  ])
  const totMonto = rows.reduce((s, f) => s + montoPesos(f.monto_total_cent), 0)
  const totItbis = rows.reduce((s, f) => s + montoPesos(f.monto_itbis_cent), 0)
  const total: Cell[] = ['', 'TOTALES', '', '', totMonto, totItbis]
  return buildXlsx('607', [headers, ...body, total])
}

function formatFecha(iso: string | null): string {
  if (!iso) return ''
  return iso.replace(/-/g, '').slice(0, 8)
}

function formatMonto(cents: number | null): string {
  if (cents === null) return ''
  return fromCents(BigInt(cents))
}

// 606 — Registro de Compras (23 columnas)
function build606(rows: FacturaRow[]): string {
  const lines = rows.map(f => {
    const cols = [
      f.rnc_emisor ?? '',                    // 1  RNC Proveedor
      f.ncf ?? '',                           // 2  NCF
      '',                                    // 3  NCF Modificado
      f.tipo_bs ?? '2',                      // 4  Tipo Bienes/Servicios
      formatFecha(f.fecha_emision),          // 5  Fecha Comprobante
      '',                                    // 6  Fecha Pago
      '',                                    // 7  Monto Servicios
      '',                                    // 8  Monto Bienes
      formatMonto(f.monto_total_cent),       // 9  Total Monto
      formatMonto(f.monto_itbis_cent),       // 10 ITBIS Facturado
      '', '', '', '', '', '',                // 11-16 ITBIS detalle
      '', '', '',                            // 17-19 ISR
      '', '', '',                            // 20-22 Otros
      f.forma_pago ?? '',                    // 23 Forma Pago
    ]
    return cols.join('|')
  })
  return lines.join('\r\n')
}

// 607 — Registro de Ventas (17 columnas)
function build607(rows: FacturaRow[]): string {
  const lines = rows.map(f => {
    const cols = [
      f.rnc_emisor ?? '',                    // 1  RNC Comprador
      f.ncf ?? '',                           // 2  NCF
      '',                                    // 3  NCF Modificado
      '1',                                   // 4  Tipo Ingreso (1=Operaciones locales)
      formatFecha(f.fecha_emision),          // 5  Fecha NCF
      '',                                    // 6  Fecha Vencimiento
      formatMonto(f.monto_itbis_cent),       // 7  ITBIS Facturado
      '', '',                                // 8-9 ITBIS ret / ISR
      formatMonto(f.monto_total_cent),       // 10 Monto Facturado
      '', '', '', '', '', '', '',            // 11-17 Formas de pago detalle
    ]
    return cols.join('|')
  })
  return lines.join('\r\n')
}
