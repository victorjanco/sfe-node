import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut } from '../api/client';

interface IdentityDocumentType {
  id: number;
  classifierCode: string;
  description: string;
  state: number;
}

interface City {
  id: number;
  name: string;
  state: number;
}

interface Customer {
  id: number;
  code: number;
  nit: string;
  invoiceName: string;
  ci?: string | null;
  name?: string | null;
  complement?: string | null;
  identityDocumentTypeCode?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
  email?: string | null;
  birthday?: string | null;
  identityDocumentTypeId?: number | null;
  cityId: number;
  synchronized: number;
  state: number;
  identityDocumentType?: { description: string };
  city?: { name: string };
}

const emptyForm = {
  id: 0,
  code: 0,
  nit: '',
  invoiceName: '',
  ci: '',
  name: '',
  complement: '',
  phone1: '',
  phone2: '',
  address: '',
  email: '',
  birthday: '',
  identityDocumentTypeId: '',
  cityId: '1',
};

export function CustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [identityTypes, setIdentityTypes] = useState<IdentityDocumentType[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await apiGet<Customer[]>('/customer');
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [t, c] = await Promise.all([
        apiGet<IdentityDocumentType[]>('/catalog/identity_document_type/get_list_enabled'),
        apiGet<City[]>('/catalog/city/get_list_enabled'),
      ]);
      setIdentityTypes(t);
      setCities(c);
    } catch (err: any) {
      setError(err.message || 'Error al cargar catálogos');
    }
  };

  useEffect(() => {
    loadCustomers();
    loadCatalogs();
  }, []);

  function openCreate(): void {
    setForm(emptyForm);
    setModalMode('create');
    setShowModal(true);
  }

  function openEdit(c: Customer): void {
    setForm({
      id: c.id,
      code: c.code,
      nit: c.nit,
      invoiceName: c.invoiceName,
      ci: c.ci ?? '',
      name: c.name ?? '',
      complement: c.complement ?? '',
      phone1: c.phone1 ?? '',
      phone2: c.phone2 ?? '',
      address: c.address ?? '',
      email: c.email ?? '',
      birthday: c.birthday ? String(c.birthday).slice(0, 10) : '',
      identityDocumentTypeId: String(c.identityDocumentTypeId ?? ''),
      cityId: String(c.cityId ?? '1'),
    });
    setModalMode('edit');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: any = {
      code: modalMode === 'edit' ? form.code : undefined,
      nit: form.nit.trim(),
      invoiceName: form.invoiceName.trim(),
      ci: form.ci.trim() || null,
      name: form.name.trim() || null,
      complement: form.complement.trim() || null,
      phone1: form.phone1.trim() || null,
      phone2: form.phone2.trim() || null,
      address: form.address.trim() || null,
      email: form.email.trim() || null,
      birthday: form.birthday ? new Date(form.birthday) : null,
      identityDocumentTypeId: form.identityDocumentTypeId ? Number(form.identityDocumentTypeId) : null,
      cityId: Number(form.cityId || 1),
      state: 1,
    };
    try {
      if (modalMode === 'create') {
        await apiPost<any>('/customer/store', payload);
      } else {
        await apiPut('/customer/update', { ...payload, id: form.id });
      }
      setShowModal(false);
      await loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setSaving(false);
    }
  }

  async function toggleState(c: Customer): Promise<void> {
    setError(null);
    try {
      if (c.state === 1) {
        await apiPut('/customer/disable', { id: c.id });
      } else {
        await apiPut('/customer/enable', { id: c.id });
      }
      await loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado');
    }
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Clientes</h3>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          Nuevo Cliente
        </button>
      </div>
      <div className="card-body">
        {error && <div className="error-text">{error}</div>}
        {loading ? (
          <div className="text-center p-4">Cargando...</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>NIT</th>
                  <th>Razón Social</th>
                  <th>Nombre</th>
                  <th>Doc. Identidad</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td><code>{c.nit}</code></td>
                    <td>{c.invoiceName}</td>
                    <td>{c.name || '-'}</td>
                    <td>{c.identityDocumentType?.description || '-'}</td>
                    <td>{c.phone1 || '-'}</td>
                    <td>{c.email || '-'}</td>
                    <td>{c.city?.name || '-'}</td>
                    <td>
                      <span className={`badge ${c.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                        {c.state === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => toggleState(c)}>
                        {c.state === 1 ? 'Deshabilitar' : 'Habilitar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center">Sin clientes registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{modalMode === 'create' ? 'Nuevo' : 'Editar'} Cliente</h4>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <label className="field">
                    <span>NIT *</span>
                    <input className="input" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Razón social *</span>
                    <input className="input" value={form.invoiceName} onChange={(e) => setForm({ ...form, invoiceName: e.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Nombre</span>
                    <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>CI</span>
                    <input className="input" value={form.ci} onChange={(e) => setForm({ ...form, ci: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Complemento</span>
                    <input className="input" value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Tipo documento identidad</span>
                    <select className="input" value={form.identityDocumentTypeId} onChange={(e) => setForm({ ...form, identityDocumentTypeId: e.target.value })}>
                      <option value="">Seleccione...</option>
                      {identityTypes.map((t) => <option key={t.id} value={t.id}>{t.description}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Teléfono 1</span>
                    <input className="input" value={form.phone1} onChange={(e) => setForm({ ...form, phone1: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Teléfono 2</span>
                    <input className="input" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Dirección</span>
                    <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Correo</span>
                    <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Fecha nacimiento</span>
                    <input type="date" className="input" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Ciudad</span>
                    <select className="input" value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value })}>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}