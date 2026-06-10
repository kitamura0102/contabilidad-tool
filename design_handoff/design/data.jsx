/* CIFRA — Datos mock + helpers (contexto dominicano: RNC, NCF, ITBIS, DGII) */

/* ---------- Helpers ---------- */
function formatMoney(n, withSymbol = true) {
  const s = Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return withSymbol ? 'RD$ ' + s : s;
}
function formatRNC(rnc) {
  const d = String(rnc).replace(/\D/g, '');
  if (d.length === 9) return `${d[0]}-${d.slice(1,3)}-${d.slice(3,8)}-${d[8]}`;
  if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,10)}-${d[10]}`;
  return d;
}
/* Mes de trabajo */
const PERIODO = { mes: 'Mayo', anio: 2026, codigo: '202605', label: 'Mayo 2026' };

/* RNCs "válidos" en el padrón mock de la DGII */
const PADRON = {
  '101023154': 'Distribuidora Corripio, S.A.',
  '130845276': 'Suplidora Nacional SRL',
  '131298540': 'Ferretería del Cibao SRL',
  '401506872': 'Importadora Mercasid SA',
  '102887143': 'Servicios Eléctricos RD',
  '130012398': 'CCN Comercial SA',
  '101654329': 'Edesur Dominicana',
  '130778201': 'Claro Dominicana',
  '124008765': 'Oficentro Suministros SRL',
  '130556410': 'Transporte y Logística JR',
};
function lookupRNC(rnc) {
  const d = String(rnc).replace(/\D/g, '');
  if (d.length !== 9 && d.length !== 11) return { state: 'format', name: null };
  if (PADRON[d]) return { state: 'valid', name: PADRON[d] };
  return { state: 'invalid', name: null };
}

/* ---------- Clientes del contador ---------- */
const CLIENTES = [
  { id: 'c1', nombre: 'Ferretería del Cibao', rnc: '131298540', tipo: 'Persona jurídica', sector: 'Comercio',
    facturas: 47, monto606: 842350.00, e606: 'listo', e607: 'listo', pendientes: 0, actividad: 'Hoy, 9:42 a.m.' },
  { id: 'c2', nombre: 'Restaurante La Bodeguita', rnc: '130556410', tipo: 'Persona jurídica', sector: 'Restaurantes',
    facturas: 31, monto606: 318900.50, e606: 'pendiente', e607: 'listo', pendientes: 3, actividad: 'Hoy, 8:15 a.m.' },
  { id: 'c3', nombre: 'Clínica Dental Sonríe', rnc: '124008765', tipo: 'Persona jurídica', sector: 'Salud',
    facturas: 18, monto606: 156400.00, e606: 'pendiente', e607: 'pendiente', pendientes: 5, actividad: 'Ayer, 6:30 p.m.' },
  { id: 'c4', nombre: 'Juan Pérez (Servicios TI)', rnc: '00112345678', tipo: 'Persona física', sector: 'Servicios',
    facturas: 9, monto606: 64200.00, e606: 'listo', e607: 'no_iniciado', pendientes: 0, actividad: 'Ayer, 2:10 p.m.' },
  { id: 'c5', nombre: 'Boutique Marisol', rnc: '130778201', tipo: 'Persona jurídica', sector: 'Comercio',
    facturas: 24, monto606: 211750.75, e606: 'pendiente', e607: 'listo', pendientes: 2, actividad: '8 jun, 4:55 p.m.' },
  { id: 'c6', nombre: 'Constructora Vega & Asoc.', rnc: '102887143', tipo: 'Persona jurídica', sector: 'Construcción',
    facturas: 0, monto606: 0, e606: 'no_iniciado', e607: 'no_iniciado', pendientes: 0, actividad: '2 jun, 11:20 a.m.' },
  { id: 'c7', nombre: 'Farmacia San Rafael', rnc: '101654329', tipo: 'Persona jurídica', sector: 'Salud',
    facturas: 38, monto606: 489300.00, e606: 'listo', e607: 'pendiente', pendientes: 1, actividad: '5 jun, 10:05 a.m.' },
  { id: 'c8', nombre: 'Auto Repuestos El Volante', rnc: '130012398', tipo: 'Persona jurídica', sector: 'Comercio',
    facturas: 52, monto606: 1024800.00, e606: 'listo', e607: 'listo', pendientes: 0, actividad: '4 jun, 3:40 p.m.' },
];

/* ---------- Tipos de NCF ---------- */
const TIPOS_NCF = {
  '01': 'Crédito fiscal', '02': 'Consumo', '11': 'Compras', '14': 'Reg. especial', '15': 'Gubernamental',
};
/* Tipo de bienes/servicios comprados (606) */
const TIPO_BS = {
  '01': '01 · Gastos de personal', '02': '02 · Trabajos/servicios', '03': '03 · Arrendamientos',
  '05': '05 · Gastos activos fijos', '06': '06 · Representación', '07': '07 · Otras deducciones',
  '09': '09 · Compras mercancías', '10': '10 · Servicios',
};

/* ---------- Facturas de compras (606) del cliente Ferretería del Cibao ---------- */
/* conf: nivel de confianza global de la extracción IA */
const COMPRAS_606 = [
  { id: 'f1', fecha: '2026-05-02', rnc: '101023154', nombre: 'Distribuidora Corripio, S.A.', ncf: 'B0100004521', tipoNcf: '01', tipoBS: '09', monto: 84500.00, itbis: 15210.00, retIsr: 0, estado: 'procesado', conf: 98 },
  { id: 'f2', fecha: '2026-05-03', rnc: '130845276', nombre: 'Suplidora Nacional SRL', ncf: 'B0100008834', tipoNcf: '01', tipoBS: '09', monto: 42300.00, itbis: 7614.00, retIsr: 0, estado: 'procesado', conf: 96 },
  { id: 'f3', fecha: '2026-05-05', rnc: '401506872', nombre: 'Importadora Mercasid SA', ncf: 'B0100012090', tipoNcf: '01', tipoBS: '09', monto: 128900.00, itbis: 23202.00, retIsr: 0, estado: 'procesado', conf: 99 },
  { id: 'f4', fecha: '2026-05-08', rnc: '102887143', nombre: 'Servicios Eléctricos RD', ncf: 'B0200000771', tipoNcf: '02', tipoBS: '10', monto: 18600.00, itbis: 3348.00, retIsr: 1860.00, estado: 'procesado', conf: 94 },
  { id: 'f5', fecha: '2026-05-09', rnc: '124008765', nombre: 'Oficentro Suministros SRL', ncf: 'B0100003310', tipoNcf: '01', tipoBS: '07', monto: 9850.00, itbis: 1773.00, retIsr: 0, estado: 'revision', conf: 72 },
  { id: 'f6', fecha: '2026-05-12', rnc: '101654329', nombre: 'Edesur Dominicana', ncf: 'B1500002214', tipoNcf: '15', tipoBS: '10', monto: 22400.00, itbis: 4032.00, retIsr: 0, estado: 'procesado', conf: 97 },
  { id: 'f7', fecha: '2026-05-14', rnc: '130778201', nombre: 'Claro Dominicana', ncf: 'B1500009987', tipoNcf: '15', tipoBS: '10', monto: 7800.00, itbis: 1404.00, retIsr: 0, estado: 'procesado', conf: 95 },
  { id: 'f8', fecha: '2026-05-16', rnc: '130012398', nombre: 'CCN Comercial SA', ncf: 'B0100021145', tipoNcf: '01', tipoBS: '09', monto: 215600.00, itbis: 38808.00, retIsr: 0, estado: 'procesado', conf: 98 },
  { id: 'f9', fecha: '2026-05-18', rnc: '130556410', nombre: 'Transporte y Logística JR', ncf: 'B0200001442', tipoNcf: '02', tipoBS: '02', monto: 12500.00, itbis: 2250.00, retIsr: 1250.00, estado: 'procesado', conf: 91 },
  { id: 'f10', fecha: '2026-05-21', rnc: '130845276', nombre: 'Suplidora Nacional SRL', ncf: 'B0100009102', tipoNcf: '01', tipoBS: '09', monto: 56700.00, itbis: 10206.00, retIsr: 0, estado: 'procesado', conf: 93 },
  { id: 'f11', fecha: '2026-05-23', rnc: '999888777', nombre: 'RNC no encontrado', ncf: 'B0100000099', tipoNcf: '01', tipoBS: '09', monto: 34200.00, itbis: 6156.00, retIsr: 0, estado: 'error', conf: 48 },
  { id: 'f12', fecha: '2026-05-26', rnc: '101023154', nombre: 'Distribuidora Corripio, S.A.', ncf: 'B0100005870', tipoNcf: '01', tipoBS: '09', monto: 91200.00, itbis: 16416.00, retIsr: 0, estado: 'procesado', conf: 97 },
  { id: 'f13', fecha: '2026-05-28', rnc: '124008765', nombre: 'Oficentro Suministros SRL', ncf: 'B0100003344', tipoNcf: '01', tipoBS: '07', monto: 14600.00, itbis: 2628.00, retIsr: 0, estado: 'revision', conf: 68 },
  { id: 'f14', fecha: '2026-05-30', rnc: '401506872', nombre: 'Importadora Mercasid SA', ncf: 'B0100013455', tipoNcf: '01', tipoBS: '09', monto: 73400.00, itbis: 13212.00, retIsr: 0, estado: 'procesado', conf: 96 },
];

/* ---------- Ventas (607) ---------- */
const VENTAS_607 = [
  { id: 'v1', fecha: '2026-05-04', rnc: '131298540', nombre: 'Consumidor final', ncf: 'B0200015501', tipoNcf: '02', monto: 23400.00, itbis: 4212.00, estado: 'procesado', conf: 99 },
  { id: 'v2', fecha: '2026-05-07', rnc: '130012398', nombre: 'Auto Repuestos El Volante', ncf: 'B0100002201', tipoNcf: '01', monto: 145000.00, itbis: 26100.00, estado: 'procesado', conf: 98 },
  { id: 'v3', fecha: '2026-05-11', rnc: '101654329', nombre: 'Farmacia San Rafael', ncf: 'B0100002202', tipoNcf: '01', monto: 67800.00, itbis: 12204.00, estado: 'procesado', conf: 97 },
  { id: 'v4', fecha: '2026-05-15', rnc: '102887143', nombre: 'Constructora Vega & Asoc.', ncf: 'B0100002203', tipoNcf: '01', monto: 312500.00, itbis: 56250.00, estado: 'procesado', conf: 96 },
  { id: 'v5', fecha: '2026-05-19', rnc: '124008765', nombre: 'Oficentro Suministros SRL', ncf: 'B0100002204', tipoNcf: '01', monto: 41200.00, itbis: 7416.00, estado: 'procesado', conf: 95 },
  { id: 'v6', fecha: '2026-05-24', rnc: '130556410', nombre: 'Consumidor final', ncf: 'B0200015502', tipoNcf: '02', monto: 18900.00, itbis: 3402.00, estado: 'procesado', conf: 99 },
  { id: 'v7', fecha: '2026-05-29', rnc: '130845276', nombre: 'Suplidora Nacional SRL', ncf: 'B0100002205', tipoNcf: '01', monto: 88600.00, itbis: 15948.00, estado: 'procesado', conf: 98 },
];

/* ---------- Bandeja de entrada (facturas recibidas por WhatsApp/email sin procesar) ---------- */
const BANDEJA = [
  { id: 'b1', via: 'whatsapp', remitente: '+1 809-555-0142', archivo: 'IMG-20260531.jpg', hora: 'Hoy, 10:12 a.m.', preview: 'factura' },
  { id: 'b2', via: 'email', remitente: 'facturas@mercasid.com.do', archivo: 'NCF-B0100013455.pdf', hora: 'Hoy, 9:05 a.m.', preview: 'pdf' },
  { id: 'b3', via: 'whatsapp', remitente: '+1 829-555-0199', archivo: 'IMG-20260530.jpg', hora: 'Ayer, 5:40 p.m.', preview: 'factura' },
];

/* ---------- Extracción IA (resultado por campo, para Upload + Corrector) ---------- */
/* nivel: 'alto' | 'medio' | 'bajo' */
const EXTRACCION = {
  archivo: 'IMG-20260531.jpg',
  campos: {
    rnc:     { valor: '101023154', nivel: 'alto',  conf: 97 },
    nombre:  { valor: 'Distribuidora Corripio, S.A.', nivel: 'alto', conf: 96 },
    ncf:     { valor: 'B0100004521', nivel: 'alto', conf: 95 },
    fecha:   { valor: '2026-05-31', nivel: 'medio', conf: 79 },
    tipoBS:  { valor: '09', nivel: 'medio', conf: 74 },
    monto:   { valor: '84500.00', nivel: 'alto', conf: 94 },
    itbis:   { valor: '15210.00', nivel: 'medio', conf: 81 },
    tasa:    { valor: '18', nivel: 'alto', conf: 99 },
  }
};
/* Caso OCR falló (para el Corrector 50/50) */
const EXTRACCION_FALLO = {
  archivo: 'IMG-20260530.jpg',
  campos: {
    rnc:     { valor: '13O845276', nivel: 'bajo',  conf: 51, nota: 'Posible 0/O confundido' },
    nombre:  { valor: 'Suplidora Nacionai SRL', nivel: 'bajo', conf: 44 },
    ncf:     { valor: 'B010000883?', nivel: 'bajo', conf: 38, nota: 'Último dígito ilegible' },
    fecha:   { valor: '2026-05-03', nivel: 'medio', conf: 76 },
    tipoBS:  { valor: '09', nivel: 'medio', conf: 70 },
    monto:   { valor: '42300.00', nivel: 'medio', conf: 72 },
    itbis:   { valor: '7614.00', nivel: 'alto', conf: 88 },
    tasa:    { valor: '18', nivel: 'alto', conf: 97 },
  }
};

/* ---------- Perfil del contador ---------- */
const CONTADOR = {
  nombre: 'Lic. Rosa Martínez',
  email_unico: 'rmartinez.cuentas@cifra.do',
  telefono: '+1 809-555-0100',
  exequatur: 'CPA-14207',
  plan: 'Profesional',
  precio: 'RD$ 2,400 / mes',
  clientes_max: 40,
  clientes_uso: 8,
};

const ESTADO_REPORTE = { listo: 'Listo', pendiente: 'Pendiente', no_iniciado: 'No iniciado' };

Object.assign(window, {
  formatMoney, formatRNC, lookupRNC, PADRON, PERIODO,
  CLIENTES, COMPRAS_606, VENTAS_607, BANDEJA, EXTRACCION, EXTRACCION_FALLO,
  TIPOS_NCF, TIPO_BS, CONTADOR, ESTADO_REPORTE,
});
