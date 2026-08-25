import { valorEnLetras } from '@sfe/core';
import {
  toNum,
  roundFormat,
  esc,
  DECIMAL_PRODUCT,
  DECIMAL_PRICE,
  DECIMAL_AMOUNT,
} from './ticket-factura';
import { NotaVentaPdfData } from './nota-rollo';

const STYLE = `
<style>
  body {
    margin: 0 auto;
    color: #001028;
    background: #ffffff;
    font-family: Arial, sans-serif;
    font-size: 12px;
  }
  table { width: 100%; border-collapse: collapse; border-spacing: 0; }
  table th, table td { border: 1px solid #000; padding: 4px 6px; }
  table th { font-weight: bold; padding: 5px 10px; white-space: nowrap; }
  table td { vertical-align: top; }
  .center { text-align: center; }
  .left { text-align: left; }
  .right { text-align: right; }
  .no-border { border: 0px; }
  .vacio1 { border: 0px; text-align: left; padding: 0px; }
  .titulo { font-size: 14px; font-weight: bold; }
  .desc { text-align: left; }
  .unit { text-align: right; padding-right: 5px; }
  .total { text-align: right; padding-right: 5px; }
  .cnt-izq { border: 1px solid #000; border-right: 0px; padding-left: 10px; font-weight: bold; text-align: right; }
  .cnt-der { border: 1px solid #000; border-left: 0px; padding: 0px 4px; text-align: right; }
  .cnt-top-bottom { border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: center; }
  .bb { border-bottom: 1px solid #000; }
  .br { border-right: 1px solid #000; }
  .bl { border-left: 1px solid #000; }
  .no-padding { padding: 0px; }
  .imagen { max-width: 100%; height: auto; }
</style>`;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function renderNotaVentaCartaHtml(data: NotaVentaPdfData): string {
  const { company, branchOffice, nota, customer, details, user } = data;
  const literal = valorEnLetras(toNum(nota.total), 'Bolivianos');
  const dt = nota.fecha instanceof Date ? nota.fecha : new Date(nota.fecha);
  const fechaTexto = Number.isNaN(dt.getTime())
    ? ''
    : `Santa Cruz, ${pad(dt.getDate())} de ${MESES[dt.getMonth()]} del ${dt.getFullYear()}`;
  const ahora = new Date();
  const fechaImpresion = `Santa Cruz, ${pad(ahora.getDate())} de ${MESES[ahora.getMonth()]} del ${ahora.getFullYear()}`;
  const horaImpresion = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;

  const detailRows = details
    .map(
      (d, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td class="desc">${esc(d.description)}</td>
        <td class="center">${roundFormat(d.amount, DECIMAL_AMOUNT)}</td>
        <td class="unit">${roundFormat(d.sellingPrice, DECIMAL_PRODUCT)}</td>
        <td class="total">${roundFormat(d.subtotal, DECIMAL_AMOUNT)}</td>
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
  <div id="hoja" style="width: 190mm; margin: 0 auto;">
    <header style="margin-bottom: 5px;">
      <table>
        <tr>
          <td class="vacio1" style="width: 40%;">
            <div class="center"><b class="titulo">${esc(company.name)}</b></div>
          </td>
          <td class="vacio1" style="width: 25%;">
            <div class="center"><b class="titulo">ORDEN DE VENTA<br/>Nº ${esc(nota.numero)}</b></div>
          </td>
          <td class="vacio1">
            <div class="center">
              <small>
                <b>${esc(branchOffice.name)}</b><br/>
                ${esc(branchOffice.address)}<br/>
                ${esc(branchOffice.city)} - Bolivia<br/>
              </small>
            </div>
          </td>
        </tr>
      </table>
    </header>

    <table style="margin-bottom: 7px; border: 1px solid #000; border-radius: 6px;">
      <tr>
        <td class="no-border no-padding" style="width: 10%;"><b>Fecha:</b></td>
        <td class="no-border no-padding" style="width: 70%;">${fechaTexto}</td>
        <td class="no-border no-padding"></td>
        <td class="no-border no-padding"></td>
      </tr>
      <tr>
        <td class="no-border no-padding" style="width: 10%;"><b>Señor(es):</b></td>
        <td class="no-border no-padding" style="width: 70%;">${esc(customer.name)}</td>
        <td class="no-border no-padding"><b>NIT/CI:</b></td>
        <td class="no-border no-padding">${esc(customer.nit)}</td>
      </tr>
    </table>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 6%;">ITEM</th>
          <th class="center" style="width: 44%;">CONCEPTO</th>
          <th class="center" style="width: 14%;">CANTIDAD</th>
          <th class="center" style="width: 18%;">P. UNITARIO</th>
          <th class="center" style="width: 18%;">SUBTOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows}
      </tbody>
    </table>

    <table style="margin-top: 8px; border: 0px;">
      <tr>
        <td class="vacio1" style="width: 60%;">
          <div style="border: 1px solid; border-radius: 5px; padding: 6px; margin-left: 4px;">
            <b>Son:</b> ${esc(literal)}
          </div>
        </td>
        <td class="vacio1" style="width: 20%;"><div class="cnt-izq"><b>SUBTOTAL Bs:</b></div></td>
        <td class="vacio1" style="width: 20%;"><div class="cnt-der">${roundFormat(nota.subtotal, DECIMAL_AMOUNT)}</div></td>
      </tr>
      <tr>
        <td class="vacio1"></td>
        <td class="vacio1"><div class="cnt-izq"><b>DESCUENTO Bs:</b></div></td>
        <td class="vacio1"><div class="cnt-der">${roundFormat(nota.discount, DECIMAL_AMOUNT)}</div></td>
      </tr>
      <tr>
        <td class="vacio1"></td>
        <td class="vacio1"><div class="cnt-izq"><b>TOTAL A PAGAR Bs:</b></div></td>
        <td class="vacio1"><div class="cnt-der">${roundFormat(nota.total, DECIMAL_AMOUNT)}</div></td>
      </tr>
      <tr>
        <td class="vacio1"><div class="cnt-izq" style="margin-left: 4px;">Fecha de impresión: ${fechaImpresion}</div></td>
        <td class="vacio1" colspan="2"><div class="cnt-top-bottom">Hora de impresión: ${horaImpresion}</div></td>
      </tr>
      <tr>
        <td class="vacio1"></td>
        <td class="vacio1" colspan="2">
          <div class="cnt-der" style="text-align: left;"><b>Usuario:</b> ${esc(user?.username ?? '')}</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}