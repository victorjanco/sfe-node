import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { SaleIndexResponse, SaleRow } from '../types';
import { formatDateBO, formatNumber } from '../utils/format';
import { PdfViewer } from './PdfViewer';

export function SalesList(): JSX.Element {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [pdfKind, setPdfKind] = useState<'factura' | 'nota'>('factura');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await apiGet<SaleIndexResponse>('/sale', params);
      setRows(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al listar ventas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [dateFrom, dateTo]);

  if (loading) return <div className="card p-4 text-center">Cargando ventas…</div>;
  if (error) {
    return (
      <div className="card p-4">
        <p className="error-text">{error}</p>
        <button className="btn" onClick={() => void load()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Ventas registradas</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
            title="Fecha desde"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
            title="Fecha hasta"
          />
          <button className="btn btn-sm" onClick={() => void load()}>
            Actualizar
          </button>
        </div>
      </div>
      <div className="card-body">
        {rows.length === 0 && <p className="notice">No hay ventas registradas.</p>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>N° Factura</th>
                  <th>Detalle</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>CUF</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const inv = s.invoiceSales?.[0]?.invoice;
                  const esNota = s.saleType === 'NOTA VENTA';
                  return (
                    <tr key={s.id}>
                      <td>{s.saleNum}</td>
                      <td>{formatDateBO(s.saleDate)}</td>
                      <td>{s.customer?.invoiceName ?? '—'}</td>
                      <td>{s.saleType}</td>
                      <td>{inv ? inv.invoiceNumFormat : '—'}</td>
                      <td className="text-right">{s.saleDetails?.length ?? 0}</td>
                      <td className="text-right">Bs {formatNumber(s.total)}</td>
                      <td>
                        <span className={`badge ${inv?.state === 'V' ? 'badge-success' : 'badge-neutral'}`}>
                          {inv?.state ?? '—'}
                        </span>
                      </td>
                      <td>
                        {inv?.cuf ? <span className="mono small">{inv.cuf}</span> : '—'}
                      </td>
                      <td>
                        {inv && inv.state === 'V' ? (
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setPdfKind('factura');
                              setPdfId(inv.id);
                            }}
                          >
                            Imprimir
                          </button>
                        ) : esNota ? (
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setPdfKind('nota');
                              setPdfId(s.id);
                            }}
                          >
                            Imprimir
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pdfId !== null && (
        <PdfViewer id={pdfId} kind={pdfKind} onClose={() => setPdfId(null)} />
      )}
    </div>
  );
}