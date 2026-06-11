import { Hono } from 'hono'
import { getDb, normalizeRnc } from '../lib/db'
import { requireAuth } from '../middleware/auth'
import type { Env, Variables } from '../types'

export const rnc = new Hono<{ Bindings: Env; Variables: Variables }>()

rnc.use('*', requireAuth)

// GET /api/rnc/:rnc — lookup en padrón local
rnc.get('/:rnc', async (c) => {
  const rawRnc = c.req.param('rnc')
  const normalized = normalizeRnc(rawRnc)
  const sql = getDb(c.env.DATABASE_URL)

  const rows = await sql`
    SELECT rnc, nombre, estado FROM padron_rnc WHERE rnc = ${normalized}
  `

  if (!rows.length) {
    return c.json({ found: false, rnc: normalized }, 404)
  }

  return c.json({ found: true, ...rows[0] })
})
