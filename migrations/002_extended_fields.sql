-- Cifra — Campos extendidos 606/607 + multi-factura + duplicados
-- Correr en Neon dashboard → SQL Editor

-- Nuevos campos extraíbles / manuales del 606
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS tipo_id                  SMALLINT,   -- 1=RNC 2=Cedula 3=Pasaporte
  ADD COLUMN IF NOT EXISTS ncf_modificado           TEXT,       -- NCF de la factura que se corrige (nota cred/deb)
  ADD COLUMN IF NOT EXISTS fecha_pago               DATE,       -- manual
  ADD COLUMN IF NOT EXISTS monto_servicios_cent     BIGINT,     -- desglose servicios
  ADD COLUMN IF NOT EXISTS monto_bienes_cent        BIGINT,     -- desglose bienes
  ADD COLUMN IF NOT EXISTS isc_cent                 BIGINT,     -- Impuesto Selectivo al Consumo
  ADD COLUMN IF NOT EXISTS otros_impuestos_cent     BIGINT,
  ADD COLUMN IF NOT EXISTS propina_cent             BIGINT,
  ADD COLUMN IF NOT EXISTS itbis_retenido_cent      BIGINT,     -- manual
  ADD COLUMN IF NOT EXISTS tipo_retencion_isr       TEXT,       -- manual
  ADD COLUMN IF NOT EXISTS monto_retencion_renta_cent BIGINT,   -- manual
  ADD COLUMN IF NOT EXISTS isr_percibido_cent       BIGINT,     -- manual
  ADD COLUMN IF NOT EXISTS itbis_proporcionalidad_cent BIGINT,  -- manual (Art.349)
  ADD COLUMN IF NOT EXISTS itbis_costo_cent         BIGINT,     -- manual
  ADD COLUMN IF NOT EXISTS itbis_adelantar_cent     BIGINT,     -- manual
  ADD COLUMN IF NOT EXISTS itbis_percibido_cent     BIGINT,     -- manual
  -- 607-specific
  ADD COLUMN IF NOT EXISTS tipo_ingreso             TEXT DEFAULT '1', -- 1=operaciones locales
  ADD COLUMN IF NOT EXISTS fecha_retencion          DATE,
  -- Multi-factura
  ADD COLUMN IF NOT EXISTS source_index             SMALLINT,   -- índice dentro del archivo fuente (0-based)
  ADD COLUMN IF NOT EXISTS source_count             SMALLINT,   -- total facturas detectadas en el archivo fuente
  -- Duplicados
  ADD COLUMN IF NOT EXISTS posible_duplicado_id     UUID REFERENCES facturas(id) ON DELETE SET NULL;

-- Índice para búsqueda de duplicados (ncf + cliente)
CREATE INDEX IF NOT EXISTS idx_facturas_ncf ON facturas(cliente_id, ncf) WHERE ncf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facturas_dup ON facturas(cliente_id, rnc_emisor, monto_total_cent, fecha_emision)
  WHERE rnc_emisor IS NOT NULL AND monto_total_cent IS NOT NULL AND fecha_emision IS NOT NULL;
