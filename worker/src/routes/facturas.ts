import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb, normalizeRnc, toCents } from '../lib/db'
import { requireAuth } from '../middleware/auth'
import type { Env, Variables } from '../types'

export const facturas = new Hono<{ Bindings: Env; Variables: Variables }>()

facturas.use('*', requireAuth)

// GET /api/facturas?cliente_id=&estado=&tipo=&limit=
facturas.get('/', async (c) => {
  const userId = c.get('userId')
  const { cliente_id, estado, tipo, limit: limitParam } = c.req.query()
  const limit = Math.min(Math.max(parseInt(limitParam ?? '100', 10) || 100, 1), 2000)
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      SELECT f.*, c.nombre_empresa
      FROM facturas f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE (${cliente_id ?? null}::uuid IS NULL OR f.cliente_id = ${cliente_id ?? null}::uuid)
        AND (${estado ?? null}::text IS NULL OR f.estado = ${estado ?? null}::text)
        AND (${tipo ?? null}::text IS NULL OR f.tipo = ${tipo ?? null}::text)
      ORDER BY f.creado_en DESC
      LIMIT ${limit}
    `,
  ] as Parameters<typeof sql.transaction>[0])

  return c.json((rows as unknown[][])[1])
})

// GET /api/facturas/:id
facturas.get('/:id', async (c) => {
  const userId = c.get('userId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`SELECT * FROM facturas WHERE id = ${c.req.param('id')}`,
  ] as Parameters<typeof sql.transaction>[0])

  const data = ((rows as unknown[][])[1] as unknown[])[0]
  if (!data) return c.json({ error: 'No encontrada' }, 404)
  return c.json(data)
})

// POST /api/facturas — upload de imagen + crear registro
// Recibe multipart/form-data: file, cliente_id, tipo
facturas.post('/', async (c) => {
  const userId = c.get('userId')
  const formData = await c.req.formData()

  const file = formData.get('file') as File | null
  const clienteId = formData.get('cliente_id') as string | null
  const tipo = (formData.get('tipo') as string | null) ?? 'compra'

  if (!file || !clienteId) {
    return c.json({ error: 'Faltan file y cliente_id' }, 400)
  }

  const ext = file.type === 'application/pdf' ? 'pdf' : 'webp'
  const key = `${userId}/${clienteId}/${Date.now()}.${ext}`

  await c.env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  const sql = getDb(c.env.DATABASE_URL)
  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      INSERT INTO facturas (cliente_id, imagen_path, tipo)
      VALUES (${clienteId}::uuid, ${key}, ${tipo})
      RETURNING *
    `,
  ] as Parameters<typeof sql.transaction>[0])

  return c.json(((rows as unknown[][])[1] as unknown[])[0], 201)
})

const correctSchema = z.object({
  rnc_emisor:       z.string().optional(),
  ncf:              z.string().optional(),
  fecha_emision:    z.string().optional(),
  monto_total_cent: z.number().int().optional(),
  monto_itbis_cent: z.number().int().optional(),
  tasa_itbis:       z.union([z.literal(16), z.literal(18)]).optional(),
  tipo_bs:          z.string().optional(),
  forma_pago:       z.string().optional(),
})

// PATCH /api/facturas/:id — corrección manual de campos
facturas.patch('/:id', zValidator('json', correctSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const sql = getDb(c.env.DATABASE_URL)

  const rnc = body.rnc_emisor ? normalizeRnc(body.rnc_emisor) : null

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      UPDATE facturas SET
        rnc_emisor        = COALESCE(${rnc}, rnc_emisor),
        ncf               = COALESCE(${body.ncf ?? null}, ncf),
        fecha_emision     = COALESCE(${body.fecha_emision ?? null}::date, fecha_emision),
        monto_total_cent  = COALESCE(${body.monto_total_cent ?? null}, monto_total_cent),
        monto_itbis_cent  = COALESCE(${body.monto_itbis_cent ?? null}, monto_itbis_cent),
        tasa_itbis        = COALESCE(${body.tasa_itbis ?? null}, tasa_itbis),
        tipo_bs           = COALESCE(${body.tipo_bs ?? null}, tipo_bs),
        forma_pago        = COALESCE(${body.forma_pago ?? null}, forma_pago),
        estado            = 'procesada',
        revisado_en       = NOW()
      WHERE id = ${c.req.param('id')}
      RETURNING *
    `,
  ] as Parameters<typeof sql.transaction>[0])

  return c.json(((rows as unknown[][])[1] as unknown[])[0])
})

// POST /api/facturas/:id/reintentar — resetea factura error_extraccion para reencolar
facturas.post('/:id/reintentar', async (c) => {
  const userId = c.get('userId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      UPDATE facturas SET
        estado       = 'en_cola',
        intentos     = 0,
        ultimo_error = NULL
      WHERE id = ${c.req.param('id')}
        AND estado = 'error_extraccion'
      RETURNING id
    `,
  ] as Parameters<typeof sql.transaction>[0])

  const data = ((rows as unknown[][])[1] as unknown[])[0]
  if (!data) return c.json({ error: 'No encontrada o no está en error' }, 404)
  return c.json({ ok: true })
})

// DELETE /api/facturas/:id — borra factura (RLS) + objeto en R2
facturas.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`DELETE FROM facturas WHERE id = ${c.req.param('id')} RETURNING imagen_path`,
  ] as Parameters<typeof sql.transaction>[0])

  const row = (((rows as unknown[][])[1]) as Array<{ imagen_path: string | null }>)[0]
  if (!row) return c.json({ error: 'No encontrada' }, 404)

  if (row.imagen_path) {
    try { await c.env.R2.delete(row.imagen_path) } catch { /* best-effort; la fila ya no existe */ }
  }
  return c.json({ ok: true })
})

// GET /api/facturas/:id/imagen — sirve imagen desde R2 con auth check
facturas.get('/:id/imagen', async (c) => {
  const userId = c.get('userId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`SELECT imagen_path FROM facturas WHERE id = ${c.req.param('id')}`,
  ] as Parameters<typeof sql.transaction>[0])

  const row = (((rows as unknown[][])[1]) as Array<{ imagen_path: string }>)[0]
  if (!row) return c.json({ error: 'No encontrada' }, 404)

  const obj = await c.env.R2.get(row.imagen_path)
  if (!obj) return c.json({ error: 'Imagen no encontrada' }, 404)

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  return new Response(obj.body, { headers })
})
