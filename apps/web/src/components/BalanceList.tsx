import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { InventoryBalanceRow, Product, Warehouse } from '../types';
import { formatNumber } from '../utils/format';

export function BalanceList(): JSX.Element {
  const [rows, setRows] = useState<InventoryBalanceRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [bal, prods, whs] = await Promise.all([
        apiGet<InventoryBalanceRow[]>('/inventory/balance', {
          from: from || undefined,
          to: to || undefined,
          product_id: productId,
          warehouse_id: warehouseId,
        }),
        apiGet<Product[]>('/product/get_list_enabled'),
        apiGet<Warehouse[]>('/inventory/warehouses'),
      ]);
      setRows(bal);
      setProducts(prods);
      setWarehouses(whs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al consultar el balance');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [from, to, productId, warehouseId]);

  const totals = rows.reduce(
    (acc, r) => ({
      initialQty: acc.initialQty + r.initialQty,
      initialValue: acc.initialValue + r.initialValue,
      entriesQty: acc.entriesQty + r.entriesQty,
      entriesValue: acc.entriesValue + r.entriesValue,
      exitsQty: acc.exitsQty + r.exitsQty,
      exitsValue: acc.exitsValue + r.exitsValue,
      finalQty: acc.finalQty + r.finalQty,
      finalValue: acc.finalValue + r.finalValue,
    }),
    {
      initialQty: 0,
      initialValue: 0,
      entriesQty: 0,
      entriesValue: 0,
      exitsQty: 0,
      exitsValue: 0,
      finalQty: 0,
      finalValue: 0,
    },
  );

  if (loading) return <div className="card p-4 text-center">Cargando balance…</div>;
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
        <h3>Balance de Inventario</h3>
        <button className="btn btn-sm" onClick={() => void load()}>
          Actualizar
        </button>
      </div>
      <div className="card-body">
        <div className="grid grid-4 filters">
          <label className="field">
            <span>Desde</span>
            <input
              className="input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input
              className="input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
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

        {rows.length === 0 && <p className="notice">No hay movimientos para el periodo seleccionado.</p>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th rowSpan={2}>Producto</th>
                  <th rowSpan={2}>Almacén</th>
                  <th colSpan={2} className="text-center">
                    Saldo Inicial
                  </th>
                  <th colSpan={2} className="text-center">
                    Entradas
                  </th>
                  <th colSpan={2} className="text-center">
                    Salidas
                  </th>
                  <th colSpan={2} className="text-center">
                    Saldo Final
                  </th>
                </tr>
                <tr>
                  <th className="text-right">Cant.</th>
                  <th className="text-right">Valor (Bs)</th>
                  <th className="text-right">Cant.</th>
                  <th className="text-right">Valor (Bs)</th>
                  <th className="text-right">Cant.</th>
                  <th className="text-right">Valor (Bs)</th>
                  <th className="text-right">Cant.</th>
                  <th className="text-right">Valor (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.product.id}-${r.warehouse.id}`}>
                    <td>
                      <div className="code-line">
                        <span className="code">{r.product.code}</span>
                        <span>{r.product.tradename}</span>
                      </div>
                    </td>
                    <td>{r.warehouse?.name ?? '—'}</td>
                    <td className="text-right">{formatNumber(r.initialQty)}</td>
                    <td className="text-right">Bs {formatNumber(r.initialValue)}</td>
                    <td className="text-right">{formatNumber(r.entriesQty)}</td>
                    <td className="text-right">Bs {formatNumber(r.entriesValue)}</td>
                    <td className="text-right">{formatNumber(r.exitsQty)}</td>
                    <td className="text-right">Bs {formatNumber(r.exitsValue)}</td>
                    <td className="text-right">
                      <strong>{formatNumber(r.finalQty)}</strong>
                    </td>
                    <td className="text-right">
                      <strong>Bs {formatNumber(r.finalValue)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="text-right">
                    <strong>TOTAL</strong>
                  </td>
                  <td className="text-right">{formatNumber(totals.initialQty)}</td>
                  <td className="text-right">Bs {formatNumber(totals.initialValue)}</td>
                  <td className="text-right">{formatNumber(totals.entriesQty)}</td>
                  <td className="text-right">Bs {formatNumber(totals.entriesValue)}</td>
                  <td className="text-right">{formatNumber(totals.exitsQty)}</td>
                  <td className="text-right">Bs {formatNumber(totals.exitsValue)}</td>
                  <td className="text-right">
                    <strong>{formatNumber(totals.finalQty)}</strong>
                  </td>
                  <td className="text-right">
                    <strong>Bs {formatNumber(totals.finalValue)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}