/** Constantes SIAT (port de app/Helpers/Helper.php) — Fase 3. */

export const ENABLE = 1;
export const DISABLE = 2;

export const EMISSION_ONLINE = 1;
export const EMISSION_OFFLINE = 2;
export const EMISSION_MASIVA = 3;

export const MODALITY_ELECTRONICA_LINEA = 1;
export const MODALITY_COMPUTARIZADA_LINEA = 2;

export const INVOICE_WITH_TAX_CREDIT = 1;
export const INVOICE_WITHOUT_TAX_CREDIT = 2;
export const DOCUMENTO_AJUSTE = 3;

export const SECTOR_COMPRA_VENTA = 1;
export const SECTOR_ALQUILER = 2;
export const SECTOR_ZONA_FRANCA = 5;
export const SECTOR_EDUCATIVOS = 11;
export const SECTOR_ICE = 14;

export const EXCEPTION_NONE = 0;
export const EXCEPTION_FOREING = 1;
export const EXCEPTION_MINOR_SALES = 2;
export const EXCEPTION_TAX_CONTROL = 3;

export const SYNC_NO = 2;
export const SYNC_YES = 1;
export const NO_CONTINGENCY = 0;

export const INVOICE_STATE_VALID = 'V';
export const INVOICE_STATE_ANULADA = 'A';
export const INVOICE_STATE_RECTIFICADA = 'R';

/** decimales por sector en el XML (ice = 5, resto 2). */
export const FRACTION_DIGITS_XML: Record<number, number> = {
  [SECTOR_COMPRA_VENTA]: 2,
  [SECTOR_ALQUILER]: 2,
  [SECTOR_ZONA_FRANCA]: 2,
  [SECTOR_EDUCATIVOS]: 2,
  [SECTOR_ICE]: 5,
};

/** Nombre del elemento raíz del XML por sector. */
export const DOCUMENT_SECTORS_NAME_XML: Record<number, string> = {
  [SECTOR_COMPRA_VENTA]: 'CompraVenta',
  [SECTOR_ICE]: 'AlcanzadaIce',
  [SECTOR_ALQUILER]: 'AlquilerBienInmueble',
  [SECTOR_ZONA_FRANCA]: 'ZonaFranca',
  [SECTOR_EDUCATIVOS]: 'SectorEducativo',
};

/** Prefijo por modalidad del XML. */
export const MODALITY_NAME_XML: Record<number, string> = {
  [MODALITY_ELECTRONICA_LINEA]: 'facturaElectronica',
  [MODALITY_COMPUTARIZADA_LINEA]: 'facturaComputarizada',
};

/** tipo de factura por sector (1 = con derecho, 2 = sin derecho). */
export const DOCUMENT_SECTORS_TYPE_INVOICES: Record<number, number> = {
  [SECTOR_COMPRA_VENTA]: INVOICE_WITH_TAX_CREDIT,
  [SECTOR_ICE]: INVOICE_WITH_TAX_CREDIT,
  [SECTOR_ALQUILER]: INVOICE_WITH_TAX_CREDIT,
  [SECTOR_EDUCATIVOS]: INVOICE_WITH_TAX_CREDIT,
  [SECTOR_ZONA_FRANCA]: INVOICE_WITHOUT_TAX_CREDIT,
};

/** Mapeo sector_document_code → classifier_code de typeInvoiceDocument (string keys para query params). */
export const DOCUMENT_SECTORS_CODES_TYPE_INVOICES: Record<string, number> = {
  '1': INVOICE_WITH_TAX_CREDIT,
  '14': INVOICE_WITH_TAX_CREDIT,
  '2': INVOICE_WITH_TAX_CREDIT,
  '5': INVOICE_WITHOUT_TAX_CREDIT,
  '11': INVOICE_WITH_TAX_CREDIT,
};

/** NIT ficticio por excepción. */
export const EXCEPTION_NITS: Record<number, string> = {
  [EXCEPTION_FOREING]: '99001',
  [EXCEPTION_TAX_CONTROL]: '99002',
  [EXCEPTION_MINOR_SALES]: '99003',
};

export const IVA_RATE = 0.13;