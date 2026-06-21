import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '../lib/db'
import { requireAuth } from '../middleware/auth'
import type { Env, Variables } from '../types'

export const clientes = new Hono<{ Bindings: Env; Variables: Variables }>()

clientes.use('*', requireAuth)

// GET /api/clientes — dashboard view con conteos de facturas
clientes.get('/', async (c) => {
  const userId = c.get('userId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`SELECT * FROM dashboard_clientes WHERE contador_id = (
      SELECT id FROM contadores WHERE clerk_id = ${userId}
    ) ORDER BY nombre_empresa`,
  ] as Parameters<typeof sql.transaction>[0])

  return c.json((rows as unknown[][])[1])
})

// GET /api/clientes/:id
clientes.get('/:id', async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`SELECT * FROM clientes WHERE id = ${c.req.param('id')} AND contador_id = ${contadorId}::uuid AND activo = TRUE`,
  ] as Parameters<typeof sql.transaction>[0])

  const data = ((rows as unknown[][])[1] as unknown[])[0]
  if (!data) return c.json({ error: 'No encontrado' }, 404)
  return c.json(data)
})

const createSchema = z.object({
  nombre_empresa: z.string().min(1),
  rnc:            z.string().min(9).max(11),
  sector:         z.string().optional(),
})

// POST /api/clientes
clientes.post('/', zValidator('json', createSchema), async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const body = c.req.valid('json')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      INSERT INTO clientes (contador_id, nombre_empresa, rnc, sector)
      VALUES (${contadorId}, ${body.nombre_empresa}, ${body.rnc}, ${body.sector ?? null})
      RETURNING *
    `,
  ] as Parameters<typeof sql.transaction>[0])

  return c.json(((rows as unknown[][])[1] as unknown[])[0], 201)
})

const updateSchema = z.object({
  nombre_empresa: z.string().min(1).optional(),
  sector:         z.string().optional(),
  activo:         z.boolean().optional(),
})

// PATCH /api/clientes/:id
clientes.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const userId = c.get('userId')
  const contadorId = c.get('contadorId')
  const body = c.req.valid('json')
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql.transaction([
    sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
    sql`
      UPDATE clientes
      SET
        nombre_empresa = COALESCE(${body.nombre_empresa ?? null}, nombre_empresa),
        sector         = COALESCE(${body.sector ?? null}, sector),
        activo         = COALESCE(${body.activo ?? null}, activo)
      WHERE id = ${c.req.param('id')}
        AND contador_id = ${contadorId}::uuid
      RETURNING *
    `,
  ] as Parameters<typeof sql.transaction>[0])

  return c.json(((rows as unknown[][])[1] as unknown[])[0])
})
