/** Sector document codes → classifierCode de typeInvoiceDocument. */
export const DOCUMENT_SECTORS_CODES_TYPE_INVOICES: Record<number, number> = {
  1: 1,   // COMPRA VENTA → CON DERECHO A CREDITO FISCAL
  14: 1,  // ICE → CON DERECHO A CREDITO FISCAL
  2: 1,   // ALQUILER → CON DERECHO A CREDITO FISCAL
  5: 2,   // ZONA FRANCA → SIN DERECHO A CREDITO FISCAL
  11: 1,  // EDUCATIVOS → CON DERECHO A CREDITO FISCAL
};

/** Sector document codes → nombre del elemento raíz del XML. */
export const DOCUMENT_SECTORS_NAME_XML: Record<number, string> = {
  1: 'CompraVenta',
  14: 'AlcanzadaIce',
  2: 'AlquilerBienInmueble',
  5: 'ZonaFranca',
  11: 'SectorEducativo',
};

export const SECTOR_DOCUMENTS: Record<string, number> = {
  FacturaCompraVenta: 1,   //  → ClassifierCode: 1
  FacturaAlquiler: 2,      //  → ClassifierCode: 2
  FacturaZonaFranca: 5,    //  → ClassifierCode: 5
  FacturaEducativa: 11,    //  → ClassifierCode: 11
  FacturaIce: 14,          //  → ClassifierCode: 14
};

export const IDENTITY_DOCUMENT: Record<string, number> = {
  NIT: 5,                   //  → ClassifierCode: 5
  CARNET_IDENTIDAD: 1,      //  → ClassifierCode: 1
};