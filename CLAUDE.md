# CLAUDE.md

Notas para trabajar en este repositorio.

## Despliegue automático (IMPORTANTE)

Hay un workflow de GitHub Actions (`.github/workflows/deploy-worker.yml`) que
**despliega el Cloudflare Worker automáticamente en cada push a `main`** que
toque `worker/**` o el propio workflow. Corre `npx wrangler deploy`.

Implicaciones al hacer cambios:

- **Cada push a `main` que toque `worker/` va a producción de inmediato.** No
  hay paso manual de deploy. Tener cuidado con lo que se commitea.
- El workflow **solo hace deploy; NO configura secrets.** Los secrets viven en
  Cloudflare (Dashboard → Worker → Settings → Variables and Secrets) y persisten
  entre deploys.
- **NUNCA poner secrets en `wrangler.toml`** (ni siquiera vacíos como
  `ANTHROPIC_API_KEY = ""`). Si se hace, el auto-deploy sobrescribe el secret
  real en Cloudflare con ese valor y rompe el worker con `invalid x-api-key` /
  similar. Los secrets solo se documentan como comentarios en `wrangler.toml` y
  se configuran en el Dashboard.

## Worker (`worker/`)

- Cloudflare Worker con Hono. Cron cada minuto (`* * * * *`) que procesa la cola
  de facturas (`src/cron/queue.ts`).
- **Extracción de facturas: Claude Haiku 4.5** (`claude-haiku-4-5`) vía la API de
  Anthropic (`src/lib/gemini.ts` — el nombre del archivo es histórico; ya no usa
  Gemini). Requiere el secret `ANTHROPIC_API_KEY`.
- Base de datos: Neon PostgreSQL (`DATABASE_URL`). Auth: Clerk
  (`CLERK_SECRET_KEY`). Almacenamiento: R2 (binding `R2`).

### Secrets requeridos (en Cloudflare, no en el repo)

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `CLERK_SECRET_KEY`

### Procesamiento de PDFs

- Los PDF multipágina se **parten en hojas sueltas al subir** (`splitPdfPages` en
  `src/lib/pdf.ts`), una hoja = un objeto R2 = un registro. La cola solo descarga
  la hoja y la manda a Claude; **no usa pdf-lib en la cola** (hacerlo recargaba el
  PDF entero por página y reventaba el límite de CPU de Cloudflare, matando el
  worker en seco y dejando facturas atascadas en `procesando`).

### Cola de facturas

- Estados: `en_cola`, `procesando`, `procesada`, `pendiente_revision`,
  `error_extraccion`.
- `intentos` se incrementa **al reclamar** la factura, no en el `catch`. Así un
  crash duro (CPU/memoria, que no pasa por el `catch`) igual cuenta como intento
  y el registro no se reintenta para siempre.
- El reinicio por timeout (registros >30 min en `procesando`) manda a
  `error_extraccion` los que agotaron `MAX_RETRIES`; el resto vuelve a `en_cola`.
- Errores transitorios (`401`/`403`/`authentication`/`429`/`quota`/`503`/etc.) no
  consumen intentos: son problemas globales (p.ej. API key mal configurada), no
  de la factura, así que esperan en cola hasta que se corrija.
