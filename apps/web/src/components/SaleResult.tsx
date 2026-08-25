import { useState } from 'react';
import { valorEnLetras } from '@sfe/core';
import { InvoiceResult } from '../types';
import { factor, formatDate, formatNumber } from '../utils/format';
import { PdfViewer } from './PdfViewer';

interface Props {
  result: InvoiceResult;
  onReset: () => void;
}

interface Props {
  result: InvoiceResult;
  onReset: () => void;
  onSuccess?: () => void;
}

export function SaleResult({ result, onReset, onSuccess }: Props): JSX.Element {
  const inv = result.invoice;
  const total = factor(inv.total);
  const literal = valorEnLetras(total, 'Bolivianos');
  const [showPdf, setShowPdf] = useState(false);

  return (
    <div className="card">
      <div className="card-header success">
        <h3>Factura registrada correctamente</h3>
        <div className="money-badge">{inv.state === 'V' ? 'VÁLIDA' : inv.state}</div>
      </div>
      <div className="card-body">
        <div className="receipt">
          <div className="receipt-row">
            <span>Número de factura</span>
            <strong>{inv.invoiceNumFormat}</strong>
          </div>
          <div className="receipt-row">
            <span>Fecha de emisión</span>
            <strong>{formatDate(inv.invoiceDate)}</strong>
          </div>
          <div className="receipt-row">
            <span>NIT / CI cliente</span>
            <strong>{inv.nitCustomer}</strong>
          </div>
          <div className="receipt-row">
            <span>Razón social</span>
            <strong>{inv.customerName}</strong>
          </div>
          <div className="receipt-row">
            <span>Total</span>
            <strong>Bs {formatNumber(inv.total)}</strong>
          </div>
          <div className="receipt-row">
            <span>IVA (13%)</span>
            <strong>Bs {formatNumber(inv.iva)}</strong>
          </div>
          <div className="receipt-row">
            <span>Monto en letras</span>
            <strong className="literal">{literal}</strong>
          </div>
          <div className="receipt-row">
            <span>Leyenda</span>
            <strong>{inv.legendDescription}</strong>
          </div>
        </div>

        <div className="receipt receipt-tech">
          <div className="receipt-row">
            <span>CUF</span>
            <strong className="mono">{inv.cuf}</strong>
          </div>
          <div className="receipt-row">
            <span>Código de control</span>
            <strong className="mono">{inv.controlCode}</strong>
          </div>
          <div className="receipt-row">
            <span>CUIS</span>
            <strong className="mono">{inv.cuis}</strong>
          </div>
          <div className="receipt-row">
            <span>CUFD</span>
            <strong className="mono">{inv.cufd}</strong>
          </div>
          <div className="receipt-row">
            <span>Código de recepción SIAT</span>
            <strong className="mono">{inv.receptionCode}</strong>
          </div>
          <div className="receipt-row">
            <span>XML</span>
            <strong className="mono small">{inv.urlXml}</strong>
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowPdf(true)}>
            Imprimir factura
          </button>
          <button className="btn btn-secondary" onClick={() => { onReset(); onSuccess?.(); }}>
            Nueva venta
          </button>
        </div>
      </div>

      {showPdf && <PdfViewer id={inv.id} kind="factura" onClose={() => setShowPdf(false)} />}
    </div>
  );
}