import { valorEnLetras } from '@sfe/core';
import {
  FacturaPdfData,
  toNum,
  roundFormat,
  formatDateTime,
  esc,
  EMISION_TEXTO,
  DECIMAL_PRODUCT,
  DECIMAL_PRICE,
  DECIMAL_AMOUNT,
} from './ticket-factura';

const STYLE = `
<style>
  body {
    position: relative;
    margin: 0 auto;
    color: #001028;
    background: #ffffff;
    font-family: Arial, sans-serif;
    font-size: 12px;
  }
  header {
    padding-bottom: 0;
    margin-bottom: 30px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
  }
  table th,
  table td {
    border: 1px solid #000;
    padding: 4px 6px;
  }
  table th {
    font-weight: bold;
    padding: 5px 10px;
    white-space: nowrap;
  }
  table td {
    vertical-align: top;
  }
  table td.service,
  table td.desc {
    vertical-align: top;
    padding: 2px;
  }
  table td.unit,
  table td.total {
    text-align: right;
    padding-right: 5px;
  }
  .center {
    text-align: center;
  }
  .left {
    text-align: left;
  }
  .right {
    text-align: right;
  }
  .no-border {
    border: 0px;
  }
  .vacio1 {
    border: 0px;
    text-align: left;
    padding-right: 0px;
    padding-left: 0px;
  }
  .cuf {
    overflow-wrap: anywhere;
    word-break: break-all;
  }
  .qr-img {
    width: 115px;
    height: 115px;
  }
  .titulo {
    color: #000;
    font-size: 14px;
    font-weight: bold;
  }
  .encabezado {
    border-bottom: 1px solid #000;
  }
  .totales td {
    border: 0px;
    padding: 1px 4px;
  }
  .totales .etiqueta {
    text-align: right;
    font-weight: bold;
    width: 75%;
  }
  .totales .valor {
    text-align: right;
    font-weight: bold;
    width: 25%;
  }
  .son {
    margin-top: 12px;
    border: 1px solid #000;
    padding: 6px;
  }
  .pie {
    margin-top: 12px;
  }
</style>`;

export function renderFacturaCartaHtml(data: FacturaPdfData): string {
  const { company, branchOffice, invoice, details, user, qrDataUrl } = data;

  const literal = valorEnLetras(toNum(invoice.totalToPay), 'Bolivianos');
  const hora = new Date();
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  const horaStr = `${pad(hora.getHours())}:${pad(hora.getMinutes())}:${pad(hora.getSeconds())}`;
  const emissionText = EMISION_TEXTO[invoice.emissionType] ?? EMISION_TEXTO[2];

  const detailRows = details
    .map(
      (d) => `
      <tr>
        <td class="desc">
          <div><b>${esc(d.productCode)} - ${esc(d.description)}</b></div>
          <div>Unidad Medida: ${esc(d.unitMeasure ?? '')}</div>
          <div>${roundFormat(d.amount, DECIMAL_PRODUCT)} x ${roundFormat(d.sellingPrice, DECIMAL_PRICE)} - ${roundFormat(d.discount, DECIMAL_AMOUNT)}</div>
        </td>
        <td class="total">
          <br><br>
          <div>${roundFormat(d.subtotal, DECIMAL_AMOUNT)}</div>
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
  <div id="hoja" style="width: 190mm; margin: 0 auto; padding-top: 10px;">
    <header>
      <table>
        <tr>
          <td class="center" style="border: 0px; padding: 2px;">
            <b class="titulo">FACTURA</b>
          </td>
        </tr>
        <tr>
          <td class="center" style="border: 0px; padding: 2px;"><b>${esc(company.name)}</b></td>
        </tr>
        <tr>
          <td class="center" style="border: 0px; padding: 2px;">Sucursal No. ${esc(branchOffice.code)} - No. Punto de Venta ${esc(invoice.pointSaleCode)}</td>
        </tr>
        <tr>
          <td class="center" style="border: 0px; padding: 2px;">${esc(invoice.address)}</td>
        </tr>
        <tr>
          <td class="center" style="border: 0px; padding: 2px;">${esc(branchOffice.city)}</td>
        </tr>
      </table>
    </header>

    <table>
      <tr>
        <td class="encabezado">
          <table>
            <tr>
              <td class="center"><b>NIT</b></td>
              <td class="center"><b>FACTURA Nº</b></td>
              <td class="center"><b>CÓD AUTORIZACION</b></td>
            </tr>
            <tr>
              <td class="center">${esc(branchOffice.nit)}</td>
              <td class="center">${esc(invoice.invoiceNum)}</td>
              <td class="center cuf">${esc(invoice.cuf)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table style="margin-top: 10px;">
      <tr>
        <td class="service" style="width: 50%;">
          <div><b>NOMBRE/RAZÓN SOCIAL:</b> ${esc(invoice.customerName)}</div>
        </td>
        <td class="service" style="width: 25%;">
          <div><b>NIT/CI/CEX:</b> ${esc(invoice.nitCustomer)}</div>
        </td>
        <td class="service" style="width: 25%;">
          <div><b>COD. CLIENTE:</b> ${esc(invoice.codeCustomer)}</div>
        </td>
      </tr>
      <tr>
        <td class="service">
          <div><b>FECHA EMISIÓN:</b> ${formatDateTime(invoice.invoiceDateFormat)}</div>
        </td>
        <td class="service"><div><b>HORA:</b> ${horaStr}</div></td>
        <td class="service">
          <div><b>CAJERO(A):</b> ${esc(user?.username ?? '')}</div>
        </td>
      </tr>
    </table>

    <table style="margin-top: 10px;">
      <thead>
        <tr>
          <th class="left" style="width: 75%;">Detalle</th>
          <th class="right" style="width: 25%;">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows}
      </tbody>
    </table>

    <table class="totales" style="margin-top: 6px; width: 100%;">
      <tr>
        <td class="etiqueta">Subtotal Bs:</td>
        <td class="valor">${roundFormat(invoice.subtotal, DECIMAL_AMOUNT)}</td>
      </tr>
      <tr>
        <td class="etiqueta">Descuento Bs:</td>
        <td class="valor">${roundFormat(invoice.discount, DECIMAL_AMOUNT)}</td>
      </tr>
      <tr>
        <td class="etiqueta">Total Bs:</td>
        <td class="valor">${roundFormat(invoice.total, DECIMAL_AMOUNT)}</td>
      </tr>
      <tr>
        <td class="etiqueta">Monto Gift Card Bs:</td>
        <td class="valor">${roundFormat(invoice.giftCardAmount, DECIMAL_AMOUNT)}</td>
      </tr>
      <tr>
        <td class="etiqueta">Monto a Pagar Bs:</td>
        <td class="valor">${roundFormat(invoice.totalToPay, DECIMAL_AMOUNT)}</td>
      </tr>
    </table>

    <div class="son">
      <b>Son:</b> ${esc(literal)}
    </div>

    <table class="pie" style="margin-top: 10px;">
      <tr>
        <td class="center" style="border: 0px;">
          <img class="qr-img" src="${qrDataUrl}" alt="QR"/>
        </td>
      </tr>
      <tr>
        <td class="center" style="border: 0px;">
          <b>ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAIS, EL USO ILICITO SERA SANCIONADO PENALMENTE DE ACUERDO A LEY</b>
        </td>
      </tr>
      <tr>
        <td class="center" style="border: 0px;">${esc(invoice.legendDescription)}</td>
      </tr>
      <tr>
        <td class="center" style="border: 0px;">${emissionText}</td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}