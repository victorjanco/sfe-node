import { valorEnLetras } from '@sfe/core';
import {
  FacturaPdfData,
  toNum,
  roundFormat,
  formatDateTime,
  esc,
  DECIMAL_PRODUCT,
  DECIMAL_PRICE,
  DECIMAL_AMOUNT,
} from './ticket-factura';

const STYLE = `
<style>
  @page { margin: 0.5cm; }
  body {
    margin: 0 auto;
    color: #001028;
    background: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
  }
  .centrado { text-align: center; }
  .der { text-align: right; }
  .izq { text-align: left; }
  table { width: 100%; border-collapse: collapse; }
  table.tbl th, table.tbl td { border: 1px solid #000; padding: 2px 4px; }
  .totales { margin-top: 6px; }
  .totales td { padding: 1px 4px; }
  .separador { white-space: nowrap; overflow-wrap: anywhere; }
</style>`;

export interface NotaVentaPdfData {
  company: { name: string };
  branchOffice: {
    name: string;
    nit: string;
    address: string;
    city: string;
  };
  nota: {
    numero: number;
    fecha: Date | string;
    subtotal: unknown;
    discount: unknown;
    total: unknown;
  };
  customer: {
    nit: string;
    name: string;
  };
  details: Array<{
    description: string;
    amount: unknown;
    sellingPrice: unknown;
    subtotal: unknown;
  }>;
  user: { username: string } | null;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function renderNotaVentaRolloHtml(data: NotaVentaPdfData): string {
  const { company, branchOffice, nota, customer, details, user } = data;
  const literal = valorEnLetras(toNum(nota.total), 'Bolivianos');
  const dt = nota.fecha instanceof Date ? nota.fecha : new Date(nota.fecha);
  const fecha = Number.isNaN(dt.getTime()) ? '' : `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  const hora = new Date();
  const horaStr = `${pad(hora.getHours())}:${pad(hora.getMinutes())}:${pad(hora.getSeconds())}`;

  const detailRows = details
    .map(
      (d, i) => `
      <tr>
        <td class="centrado">${i + 1}</td>
        <td>
          ${esc(d.description)}<br/>
          ${roundFormat(d.amount, DECIMAL_PRODUCT)} x ${roundFormat(d.sellingPrice, DECIMAL_PRICE)}
        </td>
        <td class="der">${roundFormat(d.subtotal, DECIMAL_AMOUNT)}</td>
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
  <div id="hoja" style="width: 65mm; margin: 0 auto;">
    <table>
      <tr>
        <td class="centrado" style="padding-left: 12%; padding-right: 12%;">
          <p>
            <b>${esc(company.name)}</b><br/>
            <b>${esc(branchOffice.name)}</b><br/>
            ${esc(branchOffice.address)}<br/>
            <small>${esc(branchOffice.city)} - BOLIVIA</small><br/>
            <b>COMPROBANTE DE VENTA</b><br/>
            <span class="separador">- - - - - - - - - - - - - - - - - - -</span><br/>
            <b>NIT:</b> ${esc(branchOffice.nit)}<br/>
            <b>Nro. Comp.</b> ${esc(nota.numero)}<br/>
            <span class="separador">- - - - - - - - - - - - - - - - - - -</span>
          </p>
          <p>
            <b>Fecha:</b> ${fecha}<br/>
            <b>Nit:</b> ${esc(customer.nit)}<br/>
            <b>Nombre:</b> ${esc(customer.name)}<br/>
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <table class="tbl">
            <thead>
              <tr>
                <th class="centrado" style="width: 12%;">Nro</th>
                <th style="width: 58%;">Detalle</th>
                <th class="centrado" style="width: 30%;">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${detailRows}
            </tbody>
          </table>
          <table class="totales">
            <tr>
              <td style="text-align: right;"><b>Subtotal Bs:</b></td>
              <td style="text-align: right; width: 35%;"><b>${roundFormat(nota.subtotal, DECIMAL_AMOUNT)}</b></td>
            </tr>
            <tr>
              <td style="text-align: right;"><b>Descuento Bs:</b></td>
              <td style="text-align: right;"><b>${roundFormat(nota.discount, DECIMAL_AMOUNT)}</b></td>
            </tr>
            <tr>
              <td style="text-align: right;"><b>Total a pagar Bs:</b></td>
              <td style="text-align: right;"><b>${roundFormat(nota.total, DECIMAL_AMOUNT)}</b></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <p>
            <b>Son:</b> ${esc(literal)}<br/>
            <b>Cajero:</b> ${esc(user?.username ?? '')}<br/>
            <b>Hora:</b> ${horaStr}<br/>
          </p>
          <p class="centrado">
            <b>*****Gracias por su compra, vuelva pronto*****</b>
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}