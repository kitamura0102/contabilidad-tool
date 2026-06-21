-- Cifra — Subtotal + validación aritmética de extracción
-- Correr en Neon dashboard → SQL Editor

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS monto_subtotal_cent  BIGINT,   -- base gravada (antes de ITBIS), para cuadre aritmético
  ADD COLUMN IF NOT EXISTS validacion_json      JSONB;    -- avisos de descuadre por campo (null = todo cuadra)
