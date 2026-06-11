# Sprint 0 — Worksheet de validación

Gate antes de escribir código. Llenar sobre la marcha.

## Checklist

- [ ] Paso 1 — Pedir 10 facturas variadas al contador (sin curar)
- [ ] Paso 2 — Verificar dump del padrón RNC en dgii.gov.do
- [ ] Paso 3 — Abrir Google AI Studio (Gemini 3.5 Flash)
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

| Factura | Tipo | RNC | NCF | Fecha | Monto | ITBIS | Tasa | Correctos /6 |
|---------|------|-----|-----|-------|-------|-------|------|--------------|
| 01 | PDF (e-NCF digital) | ✓ 102011303 | ✓ E310000033552 | ✓ 2026-05-28 | ✓ 5,000.00 | ✓ 762.71 | ✓ 18% | **6/6** |
| 02 | Foto WA (factura digital) | ✓ 130161453 | ✓ E310000036234 | ✓ 2026-06-08 | ✓ 4,720.00 | ✓ 720.00 | ✓ 18% | **6/6** |
| 03 | Foto WA (tique térmico) | ✓ 131789392* | ✓ B0100006964 | ✓ 2026-05-29 | ✓ 10,499.68 | ✓ 1,601.65 | ✓ 18% | **6/6** |
| 04 | | | | | | | | /6 |
| 05 | | | | | | | | /6 |
| 06 | | | | | | | | /6 |
| 07 | | | | | | | | /6 |
| 08 | | | | | | | | /6 |
| 09 | | | | | | | | /6 |
| 10 | | | | | | | | /6 |

*RNC en tique térmico viene con guiones (`1-31-78939-2`) → normalizar al guardar (remover guiones).

**Parcial: 18 / 18 = 100%  (gate: ≥85% = 51/60 sobre 10 facturas)**

Marcar cada celda: ✓ correcto / ✗ incorrecto / ∅ ilegible (null era la respuesta correcta = ✓)

### Hallazgos críticos (primera ronda)

1. **e-NCF**: 2 de 3 facturas usan formato electrónico `E310000033552` (E + 2 dígitos tipo + 10 secuencial = 13 chars). El diseño solo contemplaba formato tradicional `B0100006964` (B + 2 + 8 = 11 chars). **Corregido en DESIGN.md.**
2. **RNC con guiones**: tiques térmicos imprimen RNC como `1-31-78939-2`. Normalizar en la Edge Function (strip `-`).
3. **Tasa**: las 3 facturas son 18%. No se vio 16% en esta muestra — pendiente verificar con más facturas.
4. **Todas compras (606)**: las 3 son facturas recibidas por CODI PARTS SRL. Ninguna es venta (607) — esperado para esta primera muestra.

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

- ¿Existe descarga pública?: **SÍ** ✓
- URL: `https://dgii.gov.do/app/WebApps/Consultas/RNC/DGII_RNC.zip`
- Formato: TXT pipe-delimitado (`|`), dentro del ZIP como `DGII_RNC.TXT`
- Columnas (9): `RNC/Cédula | Nombre/Razón Social | Nombre Comercial | Categoría | Régimen de pagos | Estado | Actividad Económica | Fecha de constitución | Administración Local`
- Registros: ~1.5 millones
- Frecuencia de actualización: semanal/diaria (verificar al descargar)
- Para Cifra importamos solo 3 columnas: RNC, Nombre/Razón Social, Estado

## Números de negocio

- Cobra por cliente/mes: RD$ ___
- Clientes actuales: ___
- Clientes que podría manejar con 606/607 automático: ___
- ¿Pagaría RD$ ___ /mes por esto?: sí / no / depende de ___

## Decisión

- [x] **GATE PASADO (parcial)** → 18/18 en primeras 3 facturas. Pendiente 7 facturas más + cronómetro + fricción.
- [ ] GATE FALLADO en OCR → ajustar prompt / preprocesamiento / probar otro modelo
- [ ] GATE FALLADO en valor (B no es más rápido que A) → repensar el producto antes de codear
