# Sprint 0 — Worksheet de validación

Gate antes de escribir código. Llenar sobre la marcha.

## Checklist

- [ ] Paso 1 — Pedir 10 facturas variadas al contador (sin curar)
- [ ] Paso 2 — Verificar dump del padrón RNC en dgii.gov.do
- [ ] Paso 3 — Abrir Google AI Studio (Gemini 2.0 Flash)
- [ ] Paso 4 — Carpeta sprint0/ con fotos numeradas
- [ ] Paso 5-6 — Extraer las 10 facturas y anotar resultados
- [ ] Paso 7 — Calcular % de extracción (gate: ≥85%)
- [ ] Paso 8 — Cronómetro A: transcripción Excel (3 facturas)
- [ ] Paso 9 — Cronómetro B: flujo Cifra simulado (mismas 3)
- [ ] Paso 10 — Test de fricción WhatsApp → PC (observar sin ayudar)
- [ ] Paso 11 — Preguntas de negocio (pricing, # clientes)
- [ ] Paso 12 — Guardar facturas + respuestas correctas (futura eval suite)
- [ ] Paso 13 — Decisión: gate pasado / fallado

## Prompt de extracción

```
Extrae de esta factura dominicana y devuelve SOLO un JSON:
{
  "rnc_emisor": { "value": "...", "confidence": "high|medium|low" },
  "ncf": { "value": "...", "confidence": "..." },
  "fecha_emision": { "value": "AAAA-MM-DD", "confidence": "..." },
  "monto_total": { "value": "...", "confidence": "..." },
  "monto_itbis": { "value": "...", "confidence": "..." },
  "tasa_itbis": { "value": "16|18", "confidence": "..." }
}
Si un campo no es legible, value: null y confidence: "low".
```

## Resultados de extracción

| Factura | Tipo (foto/PDF/térmica/talonario) | RNC | NCF | Fecha | Monto | ITBIS | Tasa | Correctos /6 |
|---------|-----------------------------------|-----|-----|-------|-------|-------|------|--------------|
| 01 | | | | | | | | /6 |
| 02 | | | | | | | | /6 |
| 03 | | | | | | | | /6 |
| 04 | | | | | | | | /6 |
| 05 | | | | | | | | /6 |
| 06 | | | | | | | | /6 |
| 07 | | | | | | | | /6 |
| 08 | | | | | | | | /6 |
| 09 | | | | | | | | /6 |
| 10 | | | | | | | | /6 |

**Total: ___ / 60 = ___%  (gate: ≥85% = 51/60)**

Marcar cada celda: ✓ correcto / ✗ incorrecto / ∅ ilegible (null era la respuesta correcta = ✓)

## Cronómetro

| Factura | A: Excel (como siempre) | B: revisar + completar (flujo Cifra) |
|---------|------------------------|--------------------------------------|
| 1 | min | min |
| 2 | min | min |
| 3 | min | min |
| **Promedio** | | |

**¿B es claramente más rápido que A?** sí / no

## Test de fricción WhatsApp → PC

- ¿Cómo bajó las fotos? (WhatsApp Web / cable / email a sí mismo / otro): ___
- ¿Cuánto tardó?: ___
- ¿Se quejó o se trabó?: ___
- Veredicto: fricción aceptable / fricción mata el flujo → reconsiderar email de ingesta (v2)

## Padrón RNC (dgii.gov.do)

- ¿Existe descarga pública?: sí / no
- URL: ___
- Formato y columnas: ___
- Tamaño: ___
- Frecuencia de actualización: ___

## Números de negocio

- Cobra por cliente/mes: RD$ ___
- Clientes actuales: ___
- Clientes que podría manejar con 606/607 automático: ___
- ¿Pagaría RD$ ___ /mes por esto?: sí / no / depende de ___

## Decisión

- [ ] GATE PASADO → Sprint 1 (esquema SQL + Edge Function + cola)
- [ ] GATE FALLADO en OCR → ajustar prompt / preprocesamiento / probar otro modelo
- [ ] GATE FALLADO en valor (B no es más rápido que A) → repensar el producto antes de codear
