# Cifra — SaaS contable para contadores dominicanos

Herramienta web para contadores independientes en República Dominicana que manejan múltiples empresas cliente. Foto de factura → IA extrae los datos (RNC, NCF, montos, ITBIS) → reportes 606/607 listos para la DGII.

> "Cifra" es un nombre placeholder.

## Estado

**Pre-código.** Diseño y arquitectura completos; el desarrollo arranca después del Sprint 0.

- [`DESIGN.md`](DESIGN.md) — documento de diseño completo: problema, evidencia de demanda, decisiones técnicas, arquitectura bloqueada por engineering review, tareas de implementación.
- [`TODOS.md`](TODOS.md) — trabajo diferido con contexto.
- [`design_handoff/`](design_handoff/) — prototipo hi-fi navegable (8 pantallas, React vía CDN). Abrir `design_handoff/design/index.html` en el navegador.

## Stack (decidido)

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite (SPA) |
| Backend | Supabase (Postgres, Auth, Storage, RLS, Edge Functions, pg_cron) |
| Hosting | Vercel |
| IA/OCR | Gemini 3.5 Flash (solo vía Edge Function) |
| CI/CD | GitHub Actions |

Costo: $0/mes en tiers gratuitos hasta tener clientes pagando.

## Próximo paso: Sprint 0 (gate)

Sin escribir código — una tarde con un contador real:

1. 10 facturas dominicanas reales → Gemini en AI Studio → medir % de extracción correcta (gate: ≥85%)
2. Cronómetro: flujo Cifra simulado vs. transcribir en Excel
3. Observar la fricción de bajar fotos de WhatsApp a la PC
4. Verificar el dump del padrón RNC en dgii.gov.do
5. Preguntar pricing real (cuánto cobra por cliente, cuántos clientes)

Las 10 facturas anotadas se convierten en la suite de evals permanente.
