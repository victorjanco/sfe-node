import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { InventoryRow, Warehouse } from '../types';
import { formatNumber } from '../utils/format';

export function InventoryList(): JSX.Element {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [stock, whs] = await Promise.all([
        apiGet<InventoryRow[]>('/inventory', { warehouse_id: warehouseId, search }),
        apiGet<Warehouse[]>('/inventory/warehouses'),
      ]);
      setRows(stock);
      setWarehouses(whs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al consultar el inventario');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [warehouseId, search]);

  const totalValue = rows.reduce(
    (acc, r) => acc + Number(r.quantity) * Number(r.unitCost),
    0,
  );

  if (loading) return <div className="card p-4 text-center">Cargando inventario…</div>;
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
        <h3>Stock por Producto</h3>
        <button className="btn btn-sm" onClick={() => void load()}>
          Actualizar
        </button>
      </div>
      <div className="card-body">
        <div className="grid grid-3 filters">
          <label className="field">
            <span>Almacén</span>
            <select
              className="input"
              value={warehouseId ?? ''}
              onChange={(e) =>
                setWarehouseId(e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">Todos</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Buscar producto</span>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código o nombre"
            />
          </label>
          <div className="field">
            <span>Valor total del stock</span>
            <div className="money-badge">Bs {formatNumber(totalValue)}</div>
          </div>
        </div>

        {rows.length === 0 && <p className="notice">No hay stock registrado.</p>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Almacén</th>
                  <th className="text-right">Cantidad</th>
                  <th className="text-right">Costo Unit.</th>
                  <th className="text-right">Valor Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const low = Number(r.quantity) <= r.product.minimumStock;
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="code">{r.product.code}</span>
                      </td>
                      <td>{r.product.tradename}</td>
                      <td>{r.warehouse?.name ?? '—'}</td>
                      <td className="text-right">
                        {formatNumber(r.quantity)}
                        {low && <span className="badge badge-danger ml-1">Mín.</span>}
                      </td>
                      <td className="text-right">Bs {formatNumber(r.unitCost)}</td>
                      <td className="text-right">
                        Bs {formatNumber(Number(r.quantity) * Number(r.unitCost))}
                      </td>
                      <td>
                        <span className={`badge ${low ? 'badge-danger' : 'badge-success'}`}>
                          {low ? 'Stock bajo' : 'OK'}
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
  );
}