import { Hono } from 'hono'
import { getDb, fromCents } from '../lib/db'
import { buildXlsx, type Cell } from '../lib/xlsx'
import { requireAuth } from '../middleware/auth'
import type { Env, Variables } from '../types'

export const reportes = new Hono<{ Bindings: Env; Variables: Variables }>()

reportes.use('*', requireAuth)

type FacturaRow = {
  rnc_emisor:                  string | null
  tipo_id:                     number | null
  ncf:                         string | null
  ncf_modificado:              string | null
  tipo_bs:                     string | null
  fecha_emision:               string | Date | null
  fecha_pago:                  string | Date | null
  monto_total_cent:            string | number | null
  monto_itbis_cent:            string | number | null
  tasa_itbis:                  number | null
  monto_servicios_cent:        string | number | null
  monto_bienes_cent:           string | number | null
  isc_cent:                    string | number | null
  otros_impuestos_cent:        string | number | null
  propina_cent:                string | number | null
  forma_pago:                  string | null
  itbis_retenido_cent:         string | number | null
  tipo_retencion_isr:          string | null
  monto_retencion_renta_cent:  string | number | null
  isr_percibido_cent:          string | number | null
  itbis_proporcionalidad_cent: string | number | null
  itbis_costo_cent:            string | number | null
  itbis_adelantar_cent:        string | number | null
  itbis_percibido_cent:        string | number | null
  tipo_ingreso:                string | null
  tipo:                        string
  // para el header TXT
  rnc_cliente?:                string
}

// GET /api/reportes/:clienteId/:tipo/:periodo[?formato=txt|xlsx]
reportes.get('/:clienteId/:tipo/:periodo', async (c) => {
  try {
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
    const rncCliente = (facturas[0] as { rnc_cliente?: string } | undefined)?.rnc_cliente ?? ''

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
      ? build606(facturas, rncCliente, periodo)
      : build607(facturas, rncCliente, periodo)

    return new Response(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${tipo}_${periodo}.txt"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[reportes]', msg)
    return c.json({ error: msg }, 500)
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function montoPesos(cents: string | number | null): number {
  if (cents === null || cents === undefined || cents === '') return 0
  return Number(cents) / 100
}

function formatMonto(cents: string | number | null): string {
  if (cents === null || cents === undefined || cents === '') return ''
  return fromCents(BigInt(cents))
}

function formatFecha(iso: string | Date | null): string {
  if (!iso) return ''
  const s = typeof iso === 'string' ? iso : iso.toISOString()
  return s.slice(0, 10).replace(/-/g, '')
}

function formaPagoCode(fp: string | null): string {
  if (!fp) return ''
  const m: Record<string, string> = {
    efectivo: '01', tarjeta: '02', credito: '03', cheque: '04', transferencia: '05',
    permuta: '06', bonos: '07', otros: '08',
  }
  return m[fp.toLowerCase()] ?? ''
}

// ── 606 TXT — 24 columnas (orden DGII) ───────────────────────────────────────
//
// Orden oficial según herramienta DGII:
// 1  RNC/Cédula proveedor     2  Tipo ID        3  NCF          4  NCF Modificado
// 5  Tipo Bienes/Servicios    6  Fecha Compro.  7  Fecha Pago
// 8  Monto Servicios          9  Monto Bienes   10 Total Monto
// 11 ITBIS Facturado          12 ITBIS Retenido 13 ITBIS Proporcionalidad
// 14 ITBIS al Costo           15 ITBIS Adelantar 16 ITBIS Percibido
// 17 Tipo Retención ISR       18 Monto Ret.Renta 19 ISR Percibido
// 20 ISC                      21 Otros Imp.     22 Propina
// 23 Forma Pago               24 Estatus
function build606(rows: FacturaRow[], rncCliente: string, periodo: string): string {
  const header = `606|${rncCliente}|${periodo}|${rows.length}`
  const lines = rows.map(f => [
    f.rnc_emisor ?? '',                            // 1
    f.tipo_id ?? '',                               // 2
    f.ncf ?? '',                                   // 3
    f.ncf_modificado ?? '',                        // 4
    f.tipo_bs ?? '2',                              // 5
    formatFecha(f.fecha_emision),                  // 6
    formatFecha(f.fecha_pago),                     // 7
    formatMonto(f.monto_servicios_cent),           // 8
    formatMonto(f.monto_bienes_cent),              // 9
    formatMonto(f.monto_total_cent),               // 10
    formatMonto(f.monto_itbis_cent),               // 11
    formatMonto(f.itbis_retenido_cent),            // 12
    formatMonto(f.itbis_proporcionalidad_cent),    // 13
    formatMonto(f.itbis_costo_cent),               // 14
    formatMonto(f.itbis_adelantar_cent),           // 15
    formatMonto(f.itbis_percibido_cent),           // 16
    f.tipo_retencion_isr ?? '',                    // 17
    formatMonto(f.monto_retencion_renta_cent),     // 18
    formatMonto(f.isr_percibido_cent),             // 19
    formatMonto(f.isc_cent),                       // 20
    formatMonto(f.otros_impuestos_cent),           // 21
    formatMonto(f.propina_cent),                   // 22
    formaPagoCode(f.forma_pago),                   // 23
    '1',                                           // 24 Estatus (1=normal)
  ].join('|'))
  return [header, ...lines].join('\r\n')
}

// ── 607 TXT — 25 columnas (orden DGII) ───────────────────────────────────────
//
// 1  RNC/Cédula/Pasaporte  2  Tipo ID     3  NCF          4  NCF Modificado
// 5  Tipo Ingreso          6  Fecha NCF   7  Fecha Ret.
// 8  Monto Facturado       9  ITBIS Fact. 10 ITBIS Ret. Terceros
// 11 ITBIS Percibido       12 Ret.Renta   13 ISR Percibido
// 14 ISC                   15 Otros Imp.  16 Propina
// 17 Efectivo              18 Cheque/Trans/Dep  19 Tarjeta  20 Crédito
// 21 Bonos                 22 Permuta     23 Otras formas  24 Estatus
// (25 queda reservado para futura expansión DGII)
function build607(rows: FacturaRow[], rncCliente: string, periodo: string): string {
  const header = `607|${rncCliente}|${periodo}|${rows.length}`
  const lines = rows.map(f => {
    const fp = f.forma_pago?.toLowerCase() ?? ''
    const esEfectivo     = fp === 'efectivo'     ? formatMonto(f.monto_total_cent) : ''
    const esTransferencia = fp === 'transferencia' || fp === 'cheque' ? formatMonto(f.monto_total_cent) : ''
    const esTarjeta      = fp === 'tarjeta'      ? formatMonto(f.monto_total_cent) : ''
    const esCredito      = fp === 'credito'      ? formatMonto(f.monto_total_cent) : ''

    return [
      f.rnc_emisor ?? '',                          // 1
      f.tipo_id ?? '',                             // 2
      f.ncf ?? '',                                 // 3
      f.ncf_modificado ?? '',                      // 4
      f.tipo_ingreso ?? '1',                       // 5
      formatFecha(f.fecha_emision),                // 6
      formatFecha(f.fecha_pago),                   // 7  fecha retención
      formatMonto(f.monto_total_cent),             // 8
      formatMonto(f.monto_itbis_cent),             // 9
      formatMonto(f.itbis_retenido_cent),          // 10
      formatMonto(f.itbis_percibido_cent),         // 11
      formatMonto(f.monto_retencion_renta_cent),   // 12
      formatMonto(f.isr_percibido_cent),           // 13
      formatMonto(f.isc_cent),                     // 14
      formatMonto(f.otros_impuestos_cent),         // 15
      formatMonto(f.propina_cent),                 // 16
      esEfectivo,                                  // 17
      esTransferencia,                             // 18
      esTarjeta,                                   // 19
      esCredito,                                   // 20
      '',                                          // 21 Bonos
      '',                                          // 22 Permuta
      '',                                          // 23 Otras
      '1',                                         // 24 Estatus
    ].join('|')
  })
  return [header, ...lines].join('\r\n')
}

// ── 606 Excel — mismas 24 columnas ───────────────────────────────────────────
function excel606(rows: FacturaRow[]): Uint8Array {
  const headers: Cell[] = [
    '#', 'RNC/Cédula', 'Tipo ID', 'NCF', 'NCF Modificado',
    'Tipo B/S', 'Fecha Comprobante', 'Fecha Pago',
    'Monto Servicios', 'Monto Bienes', 'Total Monto',
    'ITBIS Facturado', 'ITBIS Retenido', 'ITBIS Proporcionalidad',
    'ITBIS al Costo', 'ITBIS Adelantar', 'ITBIS Percibido',
    'Tipo Ret. ISR', 'Monto Ret. Renta', 'ISR Percibido',
    'ISC', 'Otros Imp.', 'Propina', 'Forma Pago', 'Estatus',
  ]
  const body: Cell[][] = rows.map((f, i) => [
    i + 1,
    f.rnc_emisor ?? '',
    f.tipo_id ?? '',
    f.ncf ?? '',
    f.ncf_modificado ?? '',
    f.tipo_bs ?? '',
    formatFecha(f.fecha_emision),
    formatFecha(f.fecha_pago),
    montoPesos(f.monto_servicios_cent),
    montoPesos(f.monto_bienes_cent),
    montoPesos(f.monto_total_cent),
    montoPesos(f.monto_itbis_cent),
    montoPesos(f.itbis_retenido_cent),
    montoPesos(f.itbis_proporcionalidad_cent),
    montoPesos(f.itbis_costo_cent),
    montoPesos(f.itbis_adelantar_cent),
    montoPesos(f.itbis_percibido_cent),
    f.tipo_retencion_isr ?? '',
    montoPesos(f.monto_retencion_renta_cent),
    montoPesos(f.isr_percibido_cent),
    montoPesos(f.isc_cent),
    montoPesos(f.otros_impuestos_cent),
    montoPesos(f.propina_cent),
    f.forma_pago ?? '',
    '1',
  ])
  const totals: Cell[] = ['', 'TOTALES', '', '', '', '', '', '',
    rows.reduce((s, f) => s + montoPesos(f.monto_servicios_cent), 0),
    rows.reduce((s, f) => s + montoPesos(f.monto_bienes_cent), 0),
    rows.reduce((s, f) => s + montoPesos(f.monto_total_cent), 0),
    rows.reduce((s, f) => s + montoPesos(f.monto_itbis_cent), 0),
    '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]
  return buildXlsx('606', [headers, ...body, totals])
}

// ── 607 Excel — mismas 24 columnas ───────────────────────────────────────────
function excel607(rows: FacturaRow[]): Uint8Array {
  const headers: Cell[] = [
    '#', 'RNC/Cédula/Pasaporte', 'Tipo ID', 'NCF', 'NCF Modificado',
    'Tipo Ingreso', 'Fecha Comprobante', 'Fecha Retención',
    'Monto Facturado', 'ITBIS Facturado', 'ITBIS Ret. Terceros',
    'ITBIS Percibido', 'Ret. Renta', 'ISR Percibido',
    'ISC', 'Otros Imp.', 'Propina',
    'Efectivo', 'Cheque/Trans.', 'Tarjeta', 'Crédito',
    'Bonos', 'Permuta', 'Otras Formas', 'Estatus',
  ]
  const body: Cell[][] = rows.map((f, i) => {
    const fp = f.forma_pago?.toLowerCase() ?? ''
    const monto = montoPesos(f.monto_total_cent)
    return [
      i + 1,
      f.rnc_emisor ?? '',
      f.tipo_id ?? '',
      f.ncf ?? '',
      f.ncf_modificado ?? '',
      f.tipo_ingreso ?? '1',
      formatFecha(f.fecha_emision),
      formatFecha(f.fecha_pago),
      monto,
      montoPesos(f.monto_itbis_cent),
      montoPesos(f.itbis_retenido_cent),
      montoPesos(f.itbis_percibido_cent),
      montoPesos(f.monto_retencion_renta_cent),
      montoPesos(f.isr_percibido_cent),
      montoPesos(f.isc_cent),
      montoPesos(f.otros_impuestos_cent),
      montoPesos(f.propina_cent),
      fp === 'efectivo' ? monto : 0,
      fp === 'transferencia' || fp === 'cheque' ? monto : 0,
      fp === 'tarjeta' ? monto : 0,
      fp === 'credito' ? monto : 0,
      0, 0, 0,
      '1',
    ]
  })
  const totals: Cell[] = ['', 'TOTALES', '', '', '', '', '', '',
    rows.reduce((s, f) => s + montoPesos(f.monto_total_cent), 0),
    rows.reduce((s, f) => s + montoPesos(f.monto_itbis_cent), 0),
    '', '', '', '', '', '', '',
    rows.reduce((s, f) => s + (f.forma_pago?.toLowerCase() === 'efectivo' ? montoPesos(f.monto_total_cent) : 0), 0),
    rows.reduce((s, f) => s + (['transferencia', 'cheque'].includes(f.forma_pago?.toLowerCase() ?? '') ? montoPesos(f.monto_total_cent) : 0), 0),
    rows.reduce((s, f) => s + (f.forma_pago?.toLowerCase() === 'tarjeta' ? montoPesos(f.monto_total_cent) : 0), 0),
    rows.reduce((s, f) => s + (f.forma_pago?.toLowerCase() === 'credito' ? montoPesos(f.monto_total_cent) : 0), 0),
    0, 0, 0, '',
  ]
  return buildXlsx('607', [headers, ...body, totals])
}
