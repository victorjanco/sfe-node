import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api/client';
import { ProductSearch } from './ProductSearch';
import {
  Product,
  Warehouse,
  InventoryEntryType,
  InventoryExitType,
  ENTRY_TYPE_LABELS,
  EXIT_TYPE_LABELS,
} from '../types';
import { factor, formatNumber } from '../utils/format';

interface Props {
  mode: 'entry' | 'exit';
}

interface DraftRow {
  productId?: number;
  productName: string;
  productCode?: string;
  quantity: number;
  costPrice: number;
}

interface DetailRow {
  productId: number;
  productName: string;
  productCode?: string;
  quantity: number;
  costPrice: number;
}

const emptyDraft: DraftRow = { productName: '', quantity: 1, costPrice: 0 };

export function InventoryMovementForm({ mode }: Props): JSX.Element {
  const isEntry = mode === 'entry';

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [movementType, setMovementType] = useState<string>(
    isEntry ? 'INITIAL' : 'ADJUSTMENT',
  );
  const [reference, setReference] = useState('');
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [draft, setDraft] = useState<DraftRow>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Warehouse[]>('/inventory/warehouses')
      .then((whs) => {
        setWarehouses(whs);
        if (whs.length > 0) setWarehouseId(whs[0].id);
      })
      .catch(() => setWarehouses([]));
  }, []);

  function selectProduct(p: Product): void {
    setDraft({
      productId: p.id,
      productName: p.tradename,
      productCode: p.code,
      quantity: 1,
      costPrice: factor(p.costPrice),
    });
  }

  function addDetail(): void {
    if (!draft.productId || !draft.productName.trim()) return;
    setDetails([
      ...details,
      {
        productId: draft.productId,
        productName: draft.productName,
        productCode: draft.productCode,
        quantity: factor(draft.quantity),
        costPrice: factor(draft.costPrice),
      },
    ]);
    setDraft(emptyDraft);
  }

  function removeDetail(i: number): void {
    setDetails(details.filter((_, idx) => idx !== i));
  }

  function resetForm(): void {
    setDetails([]);
    setDraft(emptyDraft);
    setReference('');
    setMovementType(isEntry ? 'INITIAL' : 'ADJUSTMENT');
    setError(null);
    setSuccess(null);
  }

  async function submit(): Promise<void> {
    setError(null);
    if (!warehouseId) {
      setError('Seleccione un almacén');
      return;
    }
    if (details.length === 0) {
      setError('Agregue al menos un producto al detalle');
      return;
    }

    const base = {
      warehouseId,
      reference: reference.trim() || undefined,
      details: details.map((d) => ({
        productId: d.productId,
        quantity: d.quantity,
        costPrice: d.costPrice,
      })),
    };

    setSubmitting(true);
    try {
      if (isEntry) {
        await apiPost('/inventory/entries', {
          entryType: movementType as InventoryEntryType,
          ...base,
        });
        setSuccess('Ingreso de inventario registrado correctamente.');
      } else {
        await apiPost('/inventory/exits', {
          exitType: movementType as InventoryExitType,
          ...base,
        });
        setSuccess('Salida de inventario registrada correctamente.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar el movimiento');
    } finally {
      setSubmitting(false);
    }
  }

  const types = isEntry
    ? (Object.keys(ENTRY_TYPE_LABELS) as InventoryEntryType[])
    : (Object.keys(EXIT_TYPE_LABELS) as InventoryExitType[]);
  const labels = (isEntry ? ENTRY_TYPE_LABELS : EXIT_TYPE_LABELS) as Record<string, string>;

  if (success) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>{isEntry ? 'Ingreso de Inventario' : 'Salida de Inventario'}</h3>
        </div>
        <div className="card-body">
          <p className="notice">{success}</p>
          <div className="actions">
            <button className="btn btn-primary" onClick={resetForm}>
              Nuevo movimiento
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const total = details.reduce(
    (acc, d) => acc + d.quantity * (isEntry ? d.costPrice : 0),
    0,
  );

  return (
    <div className="card">
      <div className="card-header">
        <h3>{isEntry ? 'Registrar Ingreso de Inventario' : 'Registrar Salida de Inventario'}</h3>
      </div>
      <div className="card-body">
        <div className="grid grid-3">
          <label className="field">
            <span>Almacén</span>
            <select
              className="input"
              value={warehouseId ?? ''}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Seleccione…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo</span>
            <select
              className="input"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {labels[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Referencia (opcional)</span>
            <input
              className="input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: COMPRA N° 123"
            />
          </label>
        </div>

        <h4 className="section-title">DETALLE DEL MOVIMIENTO</h4>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Opción</th>
                <th>Código / Producto</th>
                <th>Cantidad</th>
                {isEntry && <th>Costo Unitario (Bs)</th>}
                {isEntry && <th>Subtotal (Bs)</th>}
              </tr>
            </thead>
            <tbody>
              {details.map((d, i) => (
                <tr key={i}>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => removeDetail(i)}>
                      Eliminar
                    </button>
                  </td>
                  <td>
                    <div className="code-line">
                      {d.productCode && <span className="code">{d.productCode}</span>}
                      <span>{d.productName}</span>
                    </div>
                  </td>
                  <td>{formatNumber(d.quantity)}</td>
                  {isEntry && <td>Bs {formatNumber(d.costPrice)}</td>}
                  {isEntry && <td>Bs {formatNumber(d.quantity * d.costPrice)}</td>}
                </tr>
              ))}
              <tr className="draft-row">
                <td>
                  <button className="btn btn-success btn-sm" onClick={addDetail}>
                    Agregar
                  </button>
                </td>
                <td>
                  <ProductSearch
                    onSelect={selectProduct}
                    placeholder="Buscar producto por código o nombre"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input input-sm text-right"
                    min={0}
                    step="0.01"
                    value={draft.quantity}
                    onChange={(e) => setDraft({ ...draft, quantity: factor(e.target.value) })}
                  />
                </td>
                {isEntry && (
                  <td>
                    <input
                      type="number"
                      className="input input-sm text-right"
                      min={0}
                      step="0.01"
                      value={draft.costPrice}
                      onChange={(e) => setDraft({ ...draft, costPrice: factor(e.target.value) })}
                    />
                  </td>
                )}
                {isEntry && <td className="text-right">{formatNumber(draft.quantity * draft.costPrice)}</td>}
              </tr>
            </tbody>
            {isEntry && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right">
                    <strong>Total (Bs)</strong>
                  </td>
                  <td className="text-right">{formatNumber(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="actions">
          <button className="btn btn-primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Registrando…' : isEntry ? 'Registrar Ingreso' : 'Registrar Salida'}
          </button>
          <button className="btn btn-secondary" onClick={resetForm} disabled={submitting}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}