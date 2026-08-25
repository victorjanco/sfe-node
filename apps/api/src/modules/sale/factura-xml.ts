import {
  DOCUMENT_SECTORS_NAME_XML,
  FRACTION_DIGITS_XML,
  MODALITY_NAME_XML,
} from '../../common/siat.constants';

export interface XmlCabeceraParams {
  nitEmisor: string;
  razonSocialEmisor: string;
  municipio: string;
  telefono: string | null;
  numeroFactura: number;
  cuf: string;
  cufd: string;
  codigoSucursal: number;
  direccion: string;
  codigoPuntoVenta: number;
  fechaEmision: string;
  nombreRazonSocial: string;
  codigoTipoDocumentoIdentidad: string;
  numeroDocumento: string;
  complemento: string | null;
  codigoCliente: number;
  codigoMetodoPago: string;
  numeroTarjeta: string | null;
  montoTotal: number;
  montoTotalSujetoIva: number;
  codigoMoneda: string;
  tipoCambio: number;
  montoTotalMoneda: number;
  montoGiftCard: number;
  descuentoAdicional: number;
  codigoExcepcion: number;
  cafc: string | null;
  leyenda: string;
  usuario: string;
  codigoDocumentoSector: string;
}

export interface XmlDetalleParams {
  actividadEconomica: string;
  codigoProductoSin: string;
  codigoProducto: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  montoDescuento: number;
  subTotal: number;
  numeroSerie: string | null;
  numeroImei: string | null;
}

function xmlTag(tag: string, value: string | number | null): string {
  if (value === null || value === undefined || value === '') {
    return `<${tag} xsi:nil="true"/>`;
  }
  return `<${tag}>${value}</${tag}>`;
}

/** Formatea un número con los decimales del sector (number_format PHP). */
export function formatSectorNumber(value: number, sectorDocumentId: number): string {
  const decimals = FRACTION_DIGITS_XML[sectorDocumentId] ?? 2;
  return value.toFixed(decimals);
}

/** Construye el XML facturaComputarizada/Electrónica + sector. Port fiel de SiatFacturacionHelper. */
export function buildFacturaXml(
  modality: number,
  sectorDocumentId: number,
  cabecera: XmlCabeceraParams,
  detalle: XmlDetalleParams[],
): string {
  const modalityName = MODALITY_NAME_XML[modality] ?? 'facturaComputarizada';
  const sectorName = DOCUMENT_SECTORS_NAME_XML[sectorDocumentId] ?? 'CompraVenta';
  const root = `${modalityName}${sectorName}`;

  const cabeceraXml = [
    xmlTag('nitEmisor', cabecera.nitEmisor),
    xmlTag('razonSocialEmisor', cabecera.razonSocialEmisor),
    xmlTag('municipio', cabecera.municipio),
    xmlTag('telefono', cabecera.telefono),
    xmlTag('numeroFactura', cabecera.numeroFactura),
    xmlTag('cuf', cabecera.cuf),
    xmlTag('cufd', cabecera.cufd),
    xmlTag('codigoSucursal', cabecera.codigoSucursal),
    xmlTag('direccion', cabecera.direccion),
    xmlTag('codigoPuntoVenta', cabecera.codigoPuntoVenta),
    xmlTag('fechaEmision', cabecera.fechaEmision),
    xmlTag('nombreRazonSocial', cabecera.nombreRazonSocial),
    xmlTag('codigoTipoDocumentoIdentidad', cabecera.codigoTipoDocumentoIdentidad),
    xmlTag('numeroDocumento', cabecera.numeroDocumento),
    xmlTag('complemento', cabecera.complemento),
    xmlTag('codigoCliente', cabecera.codigoCliente),
    xmlTag('codigoMetodoPago', cabecera.codigoMetodoPago),
    xmlTag('numeroTarjeta', cabecera.numeroTarjeta),
    xmlTag('montoTotal', cabecera.montoTotal.toFixed(2)),
    xmlTag('montoTotalSujetoIva', cabecera.montoTotalSujetoIva.toFixed(2)),
    xmlTag('codigoMoneda', cabecera.codigoMoneda),
    xmlTag('tipoCambio', cabecera.tipoCambio.toFixed(2)),
    xmlTag('montoTotalMoneda', cabecera.montoTotalMoneda.toFixed(2)),
    xmlTag('montoGiftCard', cabecera.montoGiftCard.toFixed(2)),
    xmlTag('descuentoAdicional', cabecera.descuentoAdicional.toFixed(2)),
    xmlTag('codigoExcepcion', cabecera.codigoExcepcion),
    xmlTag('cafc', cabecera.cafc),
    xmlTag('leyenda', cabecera.leyenda),
    xmlTag('usuario', cabecera.usuario),
    xmlTag('codigoDocumentoSector', cabecera.codigoDocumentoSector),
  ].join('');

  const detalleXml = detalle
    .map((d) => {
      const fields: string[] = [
        xmlTag('actividadEconomica', d.actividadEconomica),
        xmlTag('codigoProductoSin', d.codigoProductoSin),
        xmlTag('codigoProducto', d.codigoProducto),
        xmlTag('descripcion', d.descripcion),
        xmlTag('cantidad', formatSectorNumber(d.cantidad, sectorDocumentId)),
        xmlTag('unidadMedida', d.unidadMedida),
        xmlTag('precioUnitario', formatSectorNumber(d.precioUnitario, sectorDocumentId)),
        xmlTag('montoDescuento', formatSectorNumber(d.montoDescuento, sectorDocumentId)),
        xmlTag('subTotal', formatSectorNumber(d.subTotal, sectorDocumentId)),
        xmlTag('numeroSerie', d.numeroSerie),
        xmlTag('numeroImei', d.numeroImei),
      ];
      return `<detalle>${fields.join('')}</detalle>`;
    })
    .join('');

  return (
    `<${root} xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xsi:noNamespaceSchemaLocation="${root}.xsd">` +
    `<cabecera>${cabeceraXml}</cabecera>` +
    detalleXml +
    `</${root}>`
  );
}