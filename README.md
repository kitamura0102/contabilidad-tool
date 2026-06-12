# Cifra — SaaS contable para contadores dominicanos

Herramienta web para contadores independientes en República Dominicana que manejan múltiples empresas cliente. Foto de factura → la IA extrae los datos (RNC, NCF, montos, ITBIS) → reportes 606/607 listos para la DGII.

## Estado

**En producción.** El núcleo funciona: carga de facturas, extracción con IA, revisión, y exportación 606/607.

## Stack (real)

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite (SPA) — carpeta `app/` |
| Backend | Cloudflare Worker (Hono) — carpeta `worker/` |
| Base de datos | Neon (Postgres serverless, RLS por `app.current_user_id`) |
| Auth | Clerk (`@clerk/clerk-react` + `@clerk/backend`, Bearer token) |
| Almacenamiento | Cloudflare R2 (imágenes/PDFs de facturas, servidas con auth) |
| IA / OCR | Google Gemini 2.5 Flash (`GEMINI_MODEL`) |
| Cola | Cron del Worker cada 5 min (`*/5 * * * *`) procesa `en_cola` |
| Hosting | Frontend → Vercel · Worker → Cloudflare (`wrangler deploy`) |

## Arquitectura

```
app/      SPA (Vite + React + Clerk). Deploy automático en Vercel al hacer push a main.
worker/   Cloudflare Worker (Hono). Rutas /api/*, middleware de auth Clerk,
          cron de extracción, integración Gemini + R2 + Neon.
```

**Flujo de una factura:** upload → R2 + fila `en_cola` en Neon → el cron la toma → Gemini
extrae los campos → `procesada` (o `pendiente_revision` si baja confianza, o `error_extraccion`).
El contador revisa en la **Bandeja** (cola cross-cliente) y exporta el 606/607.

## Estados de factura

`en_cola` → `procesando` → `procesada` · `pendiente_revision` · `error_extraccion`

Solo las **`procesada`** del período entran al reporte exportado.

## Desarrollo

```bash
# Frontend
cd app && npm install && npm run dev

# Worker
cd worker && npm install && npx wrangler dev
```

Requiere variables de entorno: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_WORKER_URL` (frontend);
`DATABASE_URL`, `CLERK_SECRET_KEY`, binding R2, `GEMINI_*` (worker, vía `wrangler secret` / `wrangler.toml`).

## Deploy

- **Frontend:** push a `main` → Vercel despliega `app/`.
- **Worker:** `cd worker && npx wrangler deploy` después de cualquier cambio al worker.

## Documentos

- [`PRODUCT.md`](PRODUCT.md) — registro, usuarios, principios de diseño.
- [`DESIGN.md`](DESIGN.md) — documento de diseño original (problema, decisiones técnicas).
- [`design_handoff/`](design_handoff/) — prototipo hi-fi de referencia del rediseño.
