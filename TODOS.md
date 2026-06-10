# TODOS

## T-001 — Switch Gemini a tier pagado al primer cliente
- **What:** Cambiar la API key de Gemini de free tier a tier pagado (billing activo en Google Cloud) en la Edge Function `gemini-extract`.
- **Why:** En free tier Google puede usar los prompts (facturas con datos fiscales de terceros) para entrenamiento. Decisión T3-A del eng review (2026-06-10).
- **Pros:** El riesgo de privacidad desaparece estructuralmente. Costo ≈ $0.10/mes por contador activo con gemini-2.0-flash.
- **Cons:** Requiere cuenta de billing en Google Cloud.
- **Context:** La Edge Function centraliza la única llamada a Gemini — el switch es cambiar la key y activar billing, sin tocar código. Hasta entonces, las facturas de prueba son del contador amigo, con su consentimiento.
- **Trigger:** Primer pago recibido de un cliente real.

## T-002 — Validación de NCF en línea contra la DGII (v2)
- **What:** Verificar que un NCF está realmente autorizado al RNC emisor consultando a la DGII (no solo validación de formato).
- **Why:** Un NCF bien formado pero no autorizado (vencido/inventado) pasa el MVP y la DGII rechaza el 606 del período. Hallazgo #5 de la voz externa del eng review (2026-06-10).
- **Pros:** Cierra la última vía de rechazo DGII no cubierta.
- **Cons:** La consulta NCF de la DGII es un formulario web, no API — scraping frágil de mantenimiento recurrente.
- **Context:** El MVP valida formato NCF + existencia de RNC en padrón. El caso "NCF no autorizado" es raro y el fallo es visible (rechazo DGII), no silencioso.
- **Depends on:** Research previo (15 min): ¿la DGII expone consulta NCF estructurada o solo el formulario web?
