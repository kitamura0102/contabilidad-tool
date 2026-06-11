import { createMiddleware } from 'hono/factory'
import { createClerkClient } from '@clerk/backend'
import { getDb, withUser } from '../lib/db'
import type { Env, Variables } from '../types'

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) return c.json({ error: 'No autorizado' }, 401)

    let userId: string
    try {
      const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY })
      const payload = await clerk.verifyToken(token)
      userId = payload.sub
    } catch {
      return c.json({ error: 'Token inválido' }, 401)
    }

    // Buscar o crear el registro del contador
    const sql = getDb(c.env.DATABASE_URL)
    const rows = await sql.transaction([
      sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
      sql`
        INSERT INTO contadores (clerk_id, nombre)
        VALUES (${userId}, 'Contador')
        ON CONFLICT (clerk_id) DO NOTHING
      `,
      sql`SELECT id FROM contadores WHERE clerk_id = ${userId}`,
    ] as Parameters<typeof sql.transaction>[0])

    const contadorRows = (rows as unknown[][])[2] as Array<{ id: string }>
    if (!contadorRows.length) return c.json({ error: 'Contador no encontrado' }, 401)

    c.set('userId', userId)
    c.set('contadorId', contadorRows[0].id)
    await next()
  }
)
