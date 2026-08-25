import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { InventoryMovementRow, Product, Warehouse } from '../types';
import { formatDate, formatNumber } from '../utils/format';

export function Kardex(): JSX.Element {
  const [rows, setRows] = useState<InventoryMovementRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [movs, prods, whs] = await Promise.all([
        apiGet<InventoryMovementRow[]>('/inventory/kardex', {
          product_id: productId,
          warehouse_id: warehouseId,
        }),
        apiGet<Product[]>('/product/get_list_enabled'),
        apiGet<Warehouse[]>('/inventory/warehouses'),
      ]);
      setRows(movs);
      setProducts(prods);
      setWarehouses(whs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al consultar el kardex');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [productId, warehouseId]);

  if (loading) return <div className="card p-4 text-center">Cargando kardex…</div>;
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
        <h3>Kardex de Movimientos</h3>
        <button className="btn btn-sm" onClick={() => void load()}>
          Actualizar
        </button>
      </div>
      <div className="card-body">
        <div className="grid grid-2 filters">
          <label className="field">
            <span>Producto</span>
            <select
              className="input"
              value={productId ?? ''}
              onChange={(e) =>
                setProductId(e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">Todos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.tradename}
                </option>
              ))}
            </select>
          </label>
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
        </div>

        {rows.length === 0 && <p className="notice">No hay movimientos registrados.</p>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Almacén</th>
                  <th className="text-right">Cantidad</th>
                  <th className="text-right">Costo Unit.</th>
                  <th className="text-right">Stock Resultante</th>
                  <th>Referencia</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(m.createdAt)}</td>
                    <td>
                      <span className={`badge ${m.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                        {m.movementType === 'IN' ? 'INGRESO' : 'SALIDA'}
                      </span>
                    </td>
                    <td>
                      <div className="code-line">
                        <span className="code">{m.product.code}</span>
                        <span>{m.product.tradename}</span>
                      </div>
                    </td>
                    <td>{m.warehouse?.name ?? '—'}</td>
                    <td className="text-right">{formatNumber(m.quantity)}</td>
                    <td className="text-right">Bs {formatNumber(m.unitCost)}</td>
                    <td className="text-right">{formatNumber(m.stockAfter)}</td>
                    <td>
                      {m.referenceType} #{m.referenceId ?? ''}
                    </td>
                    <td>{m.user?.username ?? '—'}</td>
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