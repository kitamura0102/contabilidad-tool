# Product

## Register

product

> Primary surface is the app (`/app/*`): dashboard, client views, invoice corrector, report export. The landing page (`/`) shares the same brand but is a secondary surface. When register matters per-task, default to **product**; override to **brand** when working on `/` or marketing copy.

## Users

Dominican accountants (contadores) managing 5–40 client companies. They work at a desk, often with multiple tabs open, processing invoices in batch. Their context is high-stakes (DGII compliance, monetary penalties for errors), time-pressured (month-end close), and repetitive (same data fields every month).

Primary job: turn a pile of physical or forwarded invoices into a clean 606/607 report ready to upload to the DGII Oficina Virtual — without manual data entry.

Secondary job: catch and correct AI extraction errors before the report is filed.

## Product Purpose

Cifra eliminates manual invoice transcription for Dominican accountants by using AI (Gemini OCR) to extract RNC, NCF, amounts, and ITBIS from invoice photos and PDFs, then generating the 606/607 format files required by the DGII. Success is a contador who hasn't touched a spreadsheet at month-end.

## Brand Personality

Eficiente · Confiable · Precisa

The interface should feel like a sharp professional tool — like a well-calibrated instrument, not a startup playground. It earns trust through accuracy and calm, not through delight or personality. Confidence comes from the data being right, not from animations or color.

## Anti-references

**Gobierno / DGII**: No institutional blue palettes, no embedded-spreadsheet tables, no 2005-era form UI, no font stacks that read as government software.

**Software contable viejo (QuickBooks, CONTPAQi, CONTPAQ)**: No 3D icons, no gold/green gradients, no bloated sidebars with 40 items, no wizard flows with numbered steps going off-screen.

## Design Principles

1. **Precision earns trust.** Every field, every number must be legible and exact. Monospace for RNC/NCF/amounts. Dense but never noisy. The counter reads this data under pressure.

2. **AI assists; the human decides.** Confidence levels are visible, not hidden. Low-confidence fields are flagged, not silently accepted. The corrector gives the user the image and the extracted value side by side — always.

3. **Calm under load.** Month-end is stressful. The interface must stay quiet and organized even when 80 facturas are queued. No spinner anxiety; clear status, predictable behavior.

4. **Local compliance, global aesthetic.** DGII rules (NCF formats, ITBIS rates, 606/607 structure) are baked in. The UI speaks Dominican accounting natively, but looks like software from 2026.

5. **Density is a feature.** Accountants are professionals. They don't need large cards and generous whitespace. A dense, scannable table row beats a padded card. Respect their expertise.

## Accessibility & Inclusion

WCAG AA minimum. Particular attention to:
- Color contrast for data-dense tables (muted text on slate backgrounds)
- Keyboard navigation through invoice table rows and the corrector form
- `prefers-reduced-motion` respected for all transitions and loading states
- Monospace values must remain legible at system font sizes
