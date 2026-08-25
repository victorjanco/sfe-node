import { valorEnLetras } from '@sfe/core';

export interface PdfDetailRow {
  productCode: string;
  description: string;
  unitMeasure: string | null;
  amount: unknown;
  sellingPrice: unknown;
  discount: unknown;
  subtotal: unknown;
}

export interface FacturaPdfData {
  company: { name: string };
  branchOffice: { code: number; city: string; nit: string };
  invoice: {
    invoiceNum: number;
    cuf: string;
    codeCustomer: string;
    nitCustomer: string;
    customerName: string;
    invoiceDateFormat: Date | string;
    subtotal: unknown;
    discount: unknown;
    total: unknown;
    giftCardAmount: unknown;
    totalToPay: unknown;
    legendDescription: string;
    emissionType: number;
    address: string;
    pointSaleCode: number;
  };
  details: PdfDetailRow[];
  user: { username: string } | null;
  qrDataUrl: string;
}

export function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function roundFormat(v: unknown, dec: number): string {
  return toNum(v).toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDateTime(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const EMISION_TEXTO: Record<number, string> = {
  1: '“Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido en una modalidad de facturación en línea”',
  2: '“Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido fuera de línea, verifique su envío con su proveedor o en la página web www.impuestos.gob.bo”',
};

export const DECIMAL_PRODUCT = 4;
export const DECIMAL_PRICE = 2;
export const DECIMAL_AMOUNT = 2;

const STYLE = `
<style>
  @page { margin: 0.5cm; }
  body {
    position: relative;
    margin: 0 auto;
    color: #001028;
    background: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
  }
  table { width: 100%; border-collapse: collapse; border-spacing: 0; }
  table td { vertical-align: top; }
  .vacio1 {
    border: 0px;
    text-align: left;
    padding-right: 0px;
    padding-left: 0px;
  }
  .center { text-align: center; }
  .no-padding { padding: 0px; }
  .b-font-bol { font-weight: bold; }
  .tbl {
    border-collapse: separate;
    border: solid black 1px;
    border-radius: 6px;
    -moz-border-radius: 6px;
    padding-left: 5px;
  }
  .separador { text-align: center; overflow-wrap: anywhere; }
  .cuf { overflow-wrap: anywhere; word-break: break-all; }
  .qr-img { width: 115px; height: 115px; }
</style>`;

export function renderFacturaHtml(data: FacturaPdfData): string {
  const { company, branchOffice, invoice, details, user, qrDataUrl } = data;

  const literal = valorEnLetras(toNum(invoice.totalToPay), 'Bolivianos');
  const hora = new Date();
  const horaStr = `${pad(hora.getHours())}:${pad(hora.getMinutes())}:${pad(hora.getSeconds())}`;
  const emissionText = EMISION_TEXTO[invoice.emissionType] ?? EMISION_TEXTO[2];

  const detailRows = details
    .map(
      (d) => `
      <tr>
        <td>
          <div><b>${esc(d.productCode)} - ${esc(d.description)}</b></div>
          <div>Unidad Medida : ${esc(d.unitMeasure ?? '')}</div>
          <div>${roundFormat(d.amount, DECIMAL_PRODUCT)} x ${roundFormat(d.sellingPrice, DECIMAL_PRICE)} - ${roundFormat(d.discount, DECIMAL_AMOUNT)}</div>
        </td>
        <td align="right">
          <br><br>
          <div style="text-align: end;">${roundFormat(d.subtotal, DECIMAL_AMOUNT)}</div>
        </td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  ${STYLE}
</head>
<body>
  <div id="hoja" style="width: 80mm; margin: 0 auto;">
    <table style="font-family: Arial, Helvetica, sans-serif; font-size: 8pt;">
      <tr><td class="center"><b>FACTURA SIN DERECHO A CRÉDITO FISCAL</b></td></tr>
      <tr><td class="center"><b>${esc(company.name)}</b></td></tr>
      <tr><td class="center"><b>Sucursal No. ${esc(branchOffice.code)}</b></td></tr>
      <tr><td class="center"><b>No. Punto de Venta ${esc(invoice.pointSaleCode)}</b></td></tr>
      <tr><td class="center">${esc(invoice.address)}</td></tr>
      <tr><td class="center">${esc(branchOffice.city)}</td></tr>
      <tr><td class="separador">- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</td></tr>
      <tr><td class="center"><b>NIT</b></td></tr>
      <tr><td class="center">${esc(branchOffice.nit)}</td></tr>
      <tr><td class="center"><b>FACTURA Nº</b></td></tr>
      <tr><td class="center">${esc(invoice.invoiceNum)}</td></tr>
      <tr><td class="center"><b>CÓD AUTORIZACION</b></td></tr>
      <tr><td class="center cuf">${esc(invoice.cuf)}</td></tr>
      <tr><td class="separador">- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</td></tr>
    </table>
    <table style="font-family: Arial, Helvetica, sans-serif; font-size: 8pt;">
      <tr>
        <td class="vacio1" style="text-align: right; width: 50%;"><b>NOMBRE/RAZÓN SOCIAL:</b></td>
        <td class="vacio1" style="text-align: left;">${esc(invoice.customerName)}</td>
      </tr>
      <tr>
        <td class="vacio1" style="text-align: right; width: 50%;"><b>NIT/CI/CEX:</b></td>
        <td class="vacio1" style="text-align: left;">${esc(invoice.nitCustomer)}</td>
      </tr>
      <tr>
        <td class="vacio1" style="text-align: right; width: 50%;"><b>COD. CLIENTE:</b></td>
        <td class="vacio1" style="text-align: left;">${esc(invoice.codeCustomer)}</td>
      </tr>
      <tr>
        <td class="vacio1" style="text-align: right; width: 50%;"><b>FECHA EMISION:</b></td>
        <td class="vacio1" style="text-align: left;">${formatDateTime(invoice.invoiceDateFormat)}</td>
      </tr>
    </table>
    <table style="font-family: Arial, Helvetica, sans-serif; font-size: 8pt;">
      <thead>
        <tr>
          <th style="text-align: left; border-top: 1px dashed; border-bottom: 1px dashed;"><b>Detalle</b></th>
          <th style="border-top: 1px dashed; border-bottom: 1px dashed;"><b>Monto</b></th>
        </tr>
      </thead>
      <tbody>
        ${detailRows}
      </tbody>
    </table>
    <table style="font-family: Arial, Helvetica, sans-serif; font-size: 8pt;">
      <tr>
        <td style="border: 0;"></td>
        <td style="text-align: right; border: 0;"><b>Subtotal Bs:</b></td>
        <td style="text-align: right; border: 0;"><b>${roundFormat(invoice.subtotal, DECIMAL_AMOUNT)}</b></td>
      </tr>
      <tr>
        <td style="border: 0;"></td>
        <td style="text-align: right; border: 0;"><b>Descuento Bs:</b></td>
        <td style="text-align: right; border: 0;"><b>${roundFormat(invoice.discount, DECIMAL_AMOUNT)}</b></td>
      </tr>
      <tr>
        <td class="vacio1"></td>
        <td class="vacio1" style="text-align: right;"><b>Total Bs:</b></td>
        <td class="vacio1" style="text-align: right;"><b>${roundFormat(invoice.total, DECIMAL_AMOUNT)}</b></td>
      </tr>
      <tr>
        <td class="vacio1"></td>
        <td class="vacio1" style="text-align: right;"><b>Monto Gift Card Bs:</b></td>
        <td class="vacio1" style="text-align: right;"><b>${roundFormat(invoice.giftCardAmount, DECIMAL_AMOUNT)}</b></td>
      </tr>
      <tr>
        <td class="vacio1"></td>
        <td class="vacio1" style="text-align: right;"><b>Monto a Pagar Bs:</b></td>
        <td class="vacio1" style="text-align: right;"><b>${roundFormat(invoice.totalToPay, DECIMAL_AMOUNT)}</b></td>
      </tr>
    </table>
    <table style="font-family: Arial, Helvetica, sans-serif; font-size: 8pt;">
      <tr>
        <td class="vacio1"><b>Son:</b> <small>${esc(literal)}</small></td>
      </tr>
      <tr>
        <td class="vacio1" style="text-align: left;"><b>Cajero(a):</b> ${esc(user?.username ?? '')}</td>
      </tr>
      <tr>
        <td class="vacio1" style="text-align: left;"><b>Hora:</b> ${horaStr}</td>
      </tr>
    </table>
    <table style="width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 8pt;">
      <tr>
        <td class="vacio1" colspan="2" style="text-align: center;">
          <img class="qr-img" src="${qrDataUrl}" alt="QR"/>
        </td>
      </tr>
      <tr>
        <td class="vacio1" style="width: 100%; text-align: center;">
          <b>ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAIS, EL USO ILICITO SERA SANCIONADO PENALMENTE DE ACUERDO A LEY</b>
        </td>
      </tr>
      <tr>
        <td class="vacio1" style="text-align: center;">${esc(invoice.legendDescription)}</td>
      </tr>
      <tr>
        <td class="vacio1" style="text-align: center;">${emissionText}</td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}