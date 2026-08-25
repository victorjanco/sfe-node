import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InventoryMovementForm } from './InventoryMovementForm';
import { Warehouse } from '../types';
import { formatDate, formatNumber } from '../utils/format';

interface EntryHeader {
  id: number;
  entryType: string;
  reference: string | null;
  total: string;
  state: number;
  createdAt: string | null;
  warehouse: Warehouse;
  user: { username: string };
  _count: { details: number };
}

interface EntryDetail {
  id: number;
  quantity: string;
  costPrice: string;
  product: { id: number; code: string; tradename: string };
  unitMeasure: { description: string } | null;
}

interface EntryFull extends EntryHeader {
  details: EntryDetail[];
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Saldo Inicial',
  PURCHASE: 'Compra',
  RETURN: 'Devolución',
  ADJUSTMENT: 'Ajuste',
  OTHER: 'Otro',
};

export function InventoryEntriesList(): JSX.Element {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('inventory_entries.create') ?? false;
  const canDelete = user?.permissions.includes('inventory_entries.delete') ?? false;
  const [rows, setRows] = useState<EntryHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<EntryFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [annulling, setAnnulling] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<EntryHeader[]>('/inventory/entries', {
        warehouse_id: warehouseId === '' ? undefined : warehouseId,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al listar ingresos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiGet<Warehouse[]>('/inventory/warehouses')
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    void load();
  }, [warehouseId]);

  async function openDetail(id: number): Promise<void> {
    setDetailLoading(true);
    setError(null);
    try {
      const data = await apiGet<EntryFull>(`/inventory/entries/${id}`);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el ingreso');
    } finally {
      setDetailLoading(false);
    }
  }

  async function annul(id: number): Promise<void> {
    if (!window.confirm(`¿Anular el ingreso #${id}? El stock será revertido.`)) return;
    setAnnulling(id);
    setError(null);
    try {
      await apiPut(`/inventory/entries/${id}/anular`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al anular el ingreso');
    } finally {
      setAnnulling(null);
    }
  }

  if (showForm) {
    return (
      <div>
        <InventoryMovementForm mode="entry" />
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Ingresos de Inventario</h3>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nuevo Ingreso
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="grid grid-3">
          <label className="field">
            <span>Filtrar por almacén</span>
            <select
              className="input"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Todos</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && <div className="text-center">Cargando ingresos…</div>}
        {error && <p className="error-text">{error}</p>}
        {!loading && rows.length === 0 && !error && (
          <p className="notice">No hay ingresos registrados.</p>
        )}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th>Almacén</th>
                  <th>Usuario</th>
                  <th className="text-right">Ítems</th>
                  <th className="text-right">Total (Bs)</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>{ENTRY_TYPE_LABELS[r.entryType] ?? r.entryType}</td>
                    <td>{r.reference ?? '—'}</td>
                    <td>{r.warehouse?.name ?? '—'}</td>
                    <td>{r.user?.username ?? '—'}</td>
                    <td className="text-right">{r._count?.details ?? 0}</td>
                    <td className="text-right">Bs {formatNumber(r.total)}</td>
                    <td>
                      <span className={`badge ${r.state === 1 ? 'badge-success' : 'badge-danger'}`}>
                        {r.state === 1 ? 'ACTIVO' : 'ANULADO'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => void openDetail(r.id)}>
                        Ver
                      </button>{' '}
                      {r.state === 1 && canDelete && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => void annul(r.id)}
                          disabled={annulling === r.id}
                        >
                          {annulling === r.id ? 'Anulando…' : 'Anular'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailLoading && <div className="card p-4 text-center">Cargando detalle…</div>}
      {detail && !detailLoading && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Ingreso #{detail.id}</h4>
              <button className="btn-close" onClick={() => setDetail(null)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="receipt">
                <div className="receipt-row">
                  <span>Fecha</span>
                  <strong>{formatDate(detail.createdAt)}</strong>
                </div>
                <div className="receipt-row">
                  <span>Tipo</span>
                  <strong>{ENTRY_TYPE_LABELS[detail.entryType] ?? detail.entryType}</strong>
                </div>
                <div className="receipt-row">
                  <span>Referencia</span>
                  <strong>{detail.reference ?? '—'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Almacén</span>
                  <strong>{detail.warehouse?.name ?? '—'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Usuario</span>
                  <strong>{detail.user?.username ?? '—'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Estado</span>
                  <strong>{detail.state === 1 ? 'ACTIVO' : 'ANULADO'}</strong>
                </div>
              </div>
              <h4 className="section-title">DETALLE</h4>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Unidad</th>
                      <th className="text-right">Cantidad</th>
                      <th className="text-right">Costo Unit. (Bs)</th>
                      <th className="text-right">Subtotal (Bs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.details.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <span className="code">{d.product?.code}</span>
                        </td>
                        <td>{d.product?.tradename}</td>
                        <td>{d.unitMeasure?.description ?? '—'}</td>
                        <td className="text-right">{formatNumber(d.quantity)}</td>
                        <td className="text-right">Bs {formatNumber(d.costPrice)}</td>
                        <td className="text-right">
                          Bs {formatNumber(Number(d.quantity) * Number(d.costPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="text-right">
                        <strong>Total (Bs)</strong>
                      </td>
                      <td className="text-right">{formatNumber(detail.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}