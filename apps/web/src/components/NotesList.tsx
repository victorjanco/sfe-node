import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { SaleRow } from '../types';
import { formatDate, formatNumber } from '../utils/format';

export function NotesList(): JSX.Element {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<SaleRow[]>('/sale/notes');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al listar notas de venta');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <div className="card p-4 text-center">Cargando notas de venta…</div>;
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
        <h3>Notas de Venta (sin factura)</h3>
        <button className="btn btn-sm" onClick={() => void load()}>
          Actualizar
        </button>
      </div>
      <div className="card-body">
        {rows.length === 0 && <p className="notice">No hay notas de venta registradas.</p>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Detalle</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.saleNum}</td>
                    <td>{formatDate(s.saleDate)}</td>
                    <td>{s.customer?.invoiceName ?? '—'}</td>
                    <td className="text-right">{s.saleDetails?.length ?? 0}</td>
                    <td className="text-right">Bs {formatNumber(s.total)}</td>
                    <td>
                      <span className="badge badge-neutral">
                        {s.state === 1 ? 'Activa' : 'Anulada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}