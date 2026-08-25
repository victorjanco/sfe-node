import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Warehouse } from '../types';

interface NewWarehouse {
  name: string;
  code: string;
  address: string;
  description: string;
  branchOfficeId: number;
}

const emptyNew: NewWarehouse = {
  name: '',
  code: '',
  address: '',
  description: '',
  branchOfficeId: 1,
};

export function WarehousesList(): JSX.Element {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('warehouse.create') ?? false;
  const canUpdate = user?.permissions.includes('warehouse.update') ?? false;
  const canDelete = user?.permissions.includes('warehouse.delete') ?? false;
  const [rows, setRows] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<NewWarehouse>(emptyNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Warehouse[]>('/inventory/warehouses');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al listar almacenes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(): Promise<void> {
    setError(null);
    if (!form.name.trim() || !form.code.trim()) {
      setError('Nombre y código son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (editingId !== null) {
        await apiPut('/inventory/warehouses/update', {
          id: editingId,
          ...form,
          branchOfficeId: Number(form.branchOfficeId),
        });
        setSaved(true);
        setShowForm(false);
        setEditingId(null);
        setForm(emptyNew);
        await load();
      } else {
        await apiPost('/inventory/warehouses', { ...form, branchOfficeId: Number(form.branchOfficeId) });
        setSaved(true);
        setShowForm(false);
        setForm(emptyNew);
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar el almacén');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(w: Warehouse): void {
    setEditingId(w.id);
    setForm({
      name: w.name,
      code: w.code,
      address: w.address ?? '',
      description: (w as unknown as { description?: string }).description ?? '',
      branchOfficeId: w.branchOfficeId ?? 1,
    });
    setShowForm(true);
    setSaved(false);
    setError(null);
  }

  function cancelForm(): void {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyNew);
  }

  async function disable(id: number): Promise<void> {
    setError(null);
    try {
      await apiPut('/inventory/warehouses/disable', { id });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al deshabilitar el almacén');
    }
  }

  if (loading) return <div className="card p-4 text-center">Cargando almacenes…</div>;
  if (error && !rows.length) {
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
        <h3>Almacenes</h3>
        <div>
          <button className="btn btn-sm" onClick={() => void load()}>
            Actualizar
          </button>
          {canCreate && (
            <button className="btn btn-sm btn-primary ml-1" onClick={() => { setEditingId(null); setForm(emptyNew); setShowForm((v) => !v); }}>
              {showForm && editingId === null ? 'Cancelar' : 'Nuevo Almacén'}
            </button>
          )}
        </div>
      </div>
      <div className="card-body">
        {saved && <p className="notice">{editingId !== null ? 'Almacén actualizado correctamente.' : 'Almacén creado correctamente.'}</p>}

        {showForm && (
          <div className="grid grid-3 form-box">
            <h4 className="section-title" style={{ gridColumn: '1 / -1' }}>
              {editingId !== null ? `EDITAR ALMACÉN #${editingId}` : 'NUEVO ALMACÉN'}
            </h4>
            <label className="field">
              <span>Nombre</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ALMACÉN SECUNDARIO"
              />
            </label>
            <label className="field">
              <span>Código</span>
              <input
                className="input"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="ALM-002"
              />
            </label>
            <label className="field">
              <span>Dirección</span>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Descripción</span>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="field" style={{ alignSelf: 'end' }}>
              <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>
                {saving ? 'Guardando…' : editingId !== null ? 'Guardar cambios' : 'Guardar'}
              </button>
              <button className="btn btn-secondary ml-1" onClick={cancelForm}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}

        {rows.length === 0 && <p className="notice">No hay almacenes registrados.</p>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Dirección</th>
                  <th>Sucursal</th>
                  <th>Estado</th>
                  <th>Opción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <span className="code">{w.code}</span>
                    </td>
                    <td>{w.name}</td>
                    <td>{w.address ?? '—'}</td>
                    <td>{w.branchOffice?.name ?? '—'}</td>
                    <td>
                      <span className={`badge ${w.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                        {w.state === 1 ? 'Activo' : 'Deshabilitado'}
                      </span>
                    </td>
                    <td>
                      {canUpdate && (
                        <button className="btn btn-sm" onClick={() => startEdit(w)}>
                          Editar
                        </button>
                      )}{' '}
                      {w.state === 1 && canDelete && (
                        <button className="btn btn-danger btn-sm" onClick={() => void disable(w.id)}>
                          Deshabilitar
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
    </div>
  );
}