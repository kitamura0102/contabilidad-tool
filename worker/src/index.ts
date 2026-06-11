import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { clientes } from './routes/clientes'
import { facturas } from './routes/facturas'
import { reportes } from './routes/reportes'
import { rnc } from './routes/rnc'
import { processQueue } from './cron/queue'
import type { Env, Variables } from './types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

app.route('/api/clientes', clientes)
app.route('/api/facturas', facturas)
app.route('/api/reportes', reportes)
app.route('/api/rnc', rnc)

app.get('/', c => c.text('Cifra API OK'))

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(processQueue(env))
  },
}
