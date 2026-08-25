import { useState, useEffect } from 'react';
import { apiGet } from '../api/client';
import { SaleIndexResponse, SaleRow } from '../types';

interface ReportListItem extends SaleRow {
  invoiceNum?: number;
  invoiceDate: string;
  customerName: string;
  controlCode: string;
  state: string;
  total: string;
}

export function Reports() {
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [summary, setSummary] = useState<{ count: number; total: number; subtotal: number; discount: number }>({ count: 0, total: 0, subtotal: 0, discount: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchOfficeId, setBranchOfficeId] = useState('');
  const [saleType, setSaleType] = useState('');
  const [branches, setBranches] = useState<Array<{ id: number; name: string; code: number }>>([]);

  const loadBranches = async () => {
    try {
      const list = await apiGet<any[]>('/branch_office/get_list_enabled');
      setBranches(list);
    } catch { /* ignore */ }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (branchOfficeId) params.branch_office_id = branchOfficeId;
      if (saleType) params.sale_type = saleType;
      const data = await apiGet<SaleIndexResponse>('/sale', params);
      const list: ReportListItem[] = (data.items || []).map((s: any) => {
        const inv = s.invoiceSales?.[0]?.invoice;
        return {
          ...s,
          invoiceNum: inv?.invoiceNum,
          invoiceDate: inv?.invoiceDate ?? s.saleDate,
          customerName: s.customer?.invoiceName ?? 'Sin cliente',
          controlCode: inv?.controlCode ?? s.id.toString(),
          state: inv?.state ?? (s.state === 1 ? 'V' : String(s.state)),
          total: String(s.total),
        };
      });
      setItems(list);
      setTotal(data.total ?? list.length);
      setSummary({
        count: Number(data.summary?.count ?? list.length),
        total: Number(data.summary?.total ?? 0),
        subtotal: Number(data.summary?.subtotal ?? 0),
        discount: Number(data.summary?.discount ?? 0),
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadReports();
  }, [dateFrom, dateTo, branchOfficeId, saleType]);

  const handleExport = async (format: 'xlsx' = 'xlsx') => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (branchOfficeId) params.set('branch_office_id', branchOfficeId);
      if (saleType) params.set('sale_type', saleType);
      const res = await fetch(`/api/sale/export?${params.toString()}`, {
        headers: {
          ...(localStorage.getItem('token')
            ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
            : {}),
        },
      });
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `reporte-ventas-${dateFrom || 'inicio'}-${dateTo || stamp}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error al exportar');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Reporte de Ventas</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
          <select
            className="input"
            style={{ width: 'auto' }}
            value={branchOfficeId}
            onChange={(e) => setBranchOfficeId(e.target.value)}
          >
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: 'auto' }}
            value={saleType}
            onChange={(e) => setSaleType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="FACTURA">Factura</option>
            <option value="NOTA VENTA">Nota de Venta</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={loadReports}>
            Filtrar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleExport('xlsx')}>
            Exportar Excel
          </button>
        </div>
      </div>
      <div className="card-body">
        {error && <div className="error-text">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div className="card" style={{ padding: '12px', margin: 0 }}>
            <div className="text-muted small">Documentos</div>
            <div className="big-number">{summary.count}</div>
          </div>
          <div className="card" style={{ padding: '12px', margin: 0 }}>
            <div className="text-muted small">Subtotal</div>
            <div className="big-number">Bs {summary.subtotal.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: '12px', margin: 0 }}>
            <div className="text-muted small">Descuentos</div>
            <div className="big-number">Bs {summary.discount.toFixed(2)}</div>
          </div>
          <div className="card" style={{ padding: '12px', margin: 0 }}>
            <div className="text-muted small">Total</div>
            <div className="big-number success">Bs {summary.total.toFixed(2)}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center p-4">Cargando...</div>
        ) : (
          <>
            <div className="text-muted small" style={{ marginBottom: '8px' }}>
              Mostrando {items.length} de {total} documentos
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>N° Venta</th>
                    <th>N° Factura</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Código Control</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-4 text-muted">
                        No hay datos para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.saleNum}</td>
                        <td>{r.invoiceNum || '-'}</td>
                        <td>{new Date(r.invoiceDate).toLocaleDateString()}</td>
                        <td>{r.saleType}</td>
                        <td>{r.customerName}</td>
                        <td>{Number(r.total).toFixed(2)}</td>
                        <td><code style={{ fontSize: '11px' }}>{r.controlCode}</code></td>
                        <td>
                          <span className={`badge ${r.state === 'V' ? 'badge-success' : 'badge-neutral'}`}>
                            {r.state === 'V' ? 'Válida' : r.state}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
