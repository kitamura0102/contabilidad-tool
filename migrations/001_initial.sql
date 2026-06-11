-- Cifra — Schema inicial
-- Correr en Neon dashboard → SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tablas ────────────────────────────────────────────────────────────────

CREATE TABLE contadores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id    TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  exequatur   TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clientes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contador_id    UUID NOT NULL REFERENCES contadores(id) ON DELETE CASCADE,
  nombre_empresa TEXT NOT NULL,
  rnc            TEXT NOT NULL,
  sector         TEXT,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE facturas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  imagen_path       TEXT NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'en_cola'
                      CHECK (estado IN ('en_cola','procesando','procesada','pendiente_revision','error_extraccion')),
  tipo              TEXT CHECK (tipo IN ('compra','venta')),
  rnc_emisor        TEXT,
  ncf               TEXT,
  fecha_emision     DATE,
  monto_total_cent  BIGINT,
  monto_itbis_cent  BIGINT,
  tasa_itbis        SMALLINT CHECK (tasa_itbis IN (16, 18)),
  tipo_bs           TEXT,
  forma_pago        TEXT,
  confidence_json   JSONB,
  intentos          SMALLINT NOT NULL DEFAULT 0,
  ultimo_error      TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revisado_en       TIMESTAMPTZ
);

-- Solo RNC + nombre + estado (~50MB indexado de 1.5M registros)
CREATE TABLE padron_rnc (
  rnc    TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL
);

CREATE TABLE reportes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('606','607')),
  periodo      TEXT NOT NULL,  -- YYYYMM
  exportado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archivo_path TEXT
);

-- ─── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX idx_clientes_contador   ON clientes(contador_id);
CREATE INDEX idx_facturas_cliente    ON facturas(cliente_id, estado);
CREATE INDEX idx_facturas_cola       ON facturas(estado, creado_en) WHERE estado = 'en_cola';
CREATE INDEX idx_padron_rnc          ON padron_rnc(rnc);
CREATE INDEX idx_reportes_cliente    ON reportes(cliente_id, tipo, periodo);

-- ─── Vista dashboard ────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW dashboard_clientes AS
SELECT
  c.id,
  c.contador_id,
  c.nombre_empresa,
  c.rnc,
  c.sector,
  c.activo,
  COUNT(f.id) FILTER (WHERE f.estado IN ('en_cola','procesando'))    AS facturas_pendientes,
  COUNT(f.id) FILTER (WHERE f.estado = 'pendiente_revision')         AS facturas_revision,
  COUNT(f.id) FILTER (WHERE f.estado = 'procesada')                  AS facturas_listas,
  MAX(f.creado_en)                                                   AS ultima_factura
FROM clientes c
LEFT JOIN facturas f ON f.cliente_id = c.id
GROUP BY c.id;

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE contadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes   ENABLE ROW LEVEL SECURITY;

-- Cada contador ve solo sus propios datos
CREATE POLICY contadores_self ON contadores
  USING (clerk_id = current_setting('app.current_user_id', TRUE));

CREATE POLICY clientes_own ON clientes
  USING (
    contador_id = (
      SELECT id FROM contadores
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

CREATE POLICY facturas_own ON facturas
  USING (
    cliente_id IN (
      SELECT cl.id FROM clientes cl
      JOIN contadores co ON co.id = cl.contador_id
      WHERE co.clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

CREATE POLICY reportes_own ON reportes
  USING (
    cliente_id IN (
      SELECT cl.id FROM clientes cl
      JOIN contadores co ON co.id = cl.contador_id
      WHERE co.clerk_id = current_setting('app.current_user_id', TRUE)
    )
  );

-- padron_rnc es público (sin RLS)
