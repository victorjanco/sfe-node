import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { SaleIndexResponse, SaleRow } from '../types';

type ReportKind = 'sales' | 'inventory' | 'customers' | 'products';

export function ExportReports() {
  const [kind, setKind] = useState<ReportKind>('sales');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchOfficeId, setBranchOfficeId] = useState('');
  const [saleType, setSaleType] = useState('');
  const [branches, setBranches] = useState<Array<{ id: number; name: string; code: number }>>([]);
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [summary, setSummary] = useState({ count: 0, total: 0, subtotal: 0, discount: 0 });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    customers: number;
    products: number;
    warehouses: number;
    salesCount: number;
    invoicesCount: number;
  } | null>(null);

  const loadBranches = async () => {
    try {
      const list = await apiGet<any[]>('/branch_office/get_list_enabled');
      setBranches(list);
    } catch { /* ignore */ }
  };

  const loadOverview = async () => {
    try {
      const cfg = await apiGet<any>('/system/config');
      setStats(cfg.stats ?? null);
    } catch { /* ignore */ }
  };

  const loadPreview = async () => {
    if (kind !== 'sales') return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (branchOfficeId) params.branch_office_id = branchOfficeId;
      if (saleType) params.sale_type = saleType;
      params.take = '50';
      const data = await apiGet<SaleIndexResponse>('/sale', params);
      setRows(data.items || []);
      setSummary({
        count: Number(data.summary?.count ?? 0),
        total: Number(data.summary?.total ?? 0),
        subtotal: Number(data.summary?.subtotal ?? 0),
        discount: Number(data.summary?.discount ?? 0),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    loadOverview();
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [kind, dateFrom, dateTo, branchOfficeId, saleType]);

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (kind === 'sales') {
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
        if (branchOfficeId) params.set('branch_office_id', branchOfficeId);
        if (saleType) params.set('sale_type', saleType);
      }
      const endpoint = kind === 'sales' ? '/sale/export' : '/sale/export';
      const res = await fetch(`/api${endpoint}?${params.toString()}`, {
        headers: localStorage.getItem('token')
          ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
          : {},
      });
      if (!res.ok) throw new Error(`Error al exportar (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `${kind}-${dateFrom || 'inicio'}-${dateTo || stamp}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error al exportar');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>Centro de Exportación</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label className="form-label">Tipo de reporte</label>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value as ReportKind)}>
                <option value="sales">Ventas / Facturas</option>
                <option value="inventory" disabled>Inventario (próximamente)</option>
                <option value="customers" disabled>Clientes (próximamente)</option>
                <option value="products" disabled>Productos (próximamente)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Fecha desde</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Fecha hasta</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Sucursal</label>
              <select className="input" value={branchOfficeId} onChange={(e) => setBranchOfficeId(e.target.value)}>
                <option value="">Todas</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Tipo documento</label>
              <select className="input" value={saleType} onChange={(e) => setSaleType(e.target.value)}>
                <option value="">Todos</option>
                <option value="FACTURA">Facturas</option>
                <option value="NOTA VENTA">Notas de venta</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleDownload}>
                Descargar Excel
              </button>
            </div>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div className="card" style={{ padding: '10px', margin: 0 }}>
                <div className="small text-muted">Clientes</div>
                <div className="big-number">{stats.customers}</div>
              </div>
              <div className="card" style={{ padding: '10px', margin: 0 }}>
                <div className="small text-muted">Productos activos</div>
                <div className="big-number">{stats.products}</div>
              </div>
              <div className="card" style={{ padding: '10px', margin: 0 }}>
                <div className="small text-muted">Ventas registradas</div>
                <div className="big-number">{stats.salesCount}</div>
              </div>
              <div className="card" style={{ padding: '10px', margin: 0 }}>
                <div className="small text-muted">Facturas emitidas</div>
                <div className="big-number">{stats.invoicesCount}</div>
              </div>
            </div>
          )}

          {kind === 'sales' && (
            <div className="card" style={{ border: '1px dashed #ccc', margin: 0 }}>
              <div className="card-header" style={{ background: '#f8fafc' }}>
                <h4>Vista previa (últimos 50)</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span className="small text-muted">Documentos: <strong>{summary.count}</strong></span>
                  <span className="small text-muted">Subtotal: <strong>Bs {summary.subtotal.toFixed(2)}</strong></span>
                  <span className="small text-muted">Dscto.: <strong>Bs {summary.discount.toFixed(2)}</strong></span>
                  <span className="small text-muted">Total: <strong className="success">Bs {summary.total.toFixed(2)}</strong></span>
                </div>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center p-4">Cargando vista previa…</div>
                ) : rows.length === 0 ? (
                  <p className="notice">No hay datos para los filtros seleccionados.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table small">
                      <thead>
                        <tr>
                          <th>N° Venta</th>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Tipo</th>
                          <th>N° Factura</th>
                          <th className="text-right">Total</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((s) => {
                          const inv = s.invoiceSales?.[0]?.invoice;
                          return (
                            <tr key={s.id}>
                              <td>{s.saleNum}</td>
                              <td>{new Date(s.saleDate).toLocaleDateString()}</td>
                              <td>{s.customer?.invoiceName ?? '—'}</td>
                              <td>{s.saleType}</td>
                              <td>{inv?.invoiceNumFormat ?? '—'}</td>
                              <td className="text-right">{Number(s.total).toFixed(2)}</td>
                              <td>
                                <span className={`badge ${inv?.state === 'V' ? 'badge-success' : 'badge-neutral'}`}>
                                  {inv?.state ?? s.state}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
