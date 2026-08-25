import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut } from '../api/client';

interface UnitMeasure {
  id: number;
  classifierCode: string;
  description: string;
  state: number;
}

interface Activity {
  id: number;
  caebCode: string;
  description: string;
  activityType: string;
  state: number;
}

interface ProductsServices {
  id: number;
  activityCode: string;
  productCode: string;
  productDescription: string;
  activityId?: number;
  state: number;
}

interface Group {
  id: number;
  name: string;
  description: string;
  state: number;
}

interface ProductType {
  id: number;
  name: string;
  description: string;
  state: number;
}

interface ProductModel {
  id: number;
  code: string;
  name: string;
  state: number;
}

interface Product {
  id: number;
  code: string;
  tradename: string;
  genericName: string;
  dimension: string;
  costPrice: string;
  sellingPrice: string;
  wholesaleSellingPrice: string;
  minimumStock: number;
  state: number;
  groupId: number;
  productModelId: number;
  unitMeasureId: number;
  productTypeId: number;
  activityId: number;
  productsServicesId: number;
  settingTableId: number;
  userId: number;
  branchOfficeId: number;
  registrationDate: string;
  modificationDate: string;
  group?: { name: string };
  unitMeasure?: { description: string };
  activity?: { description: string };
  productType?: { name: string };
  productModel?: { name: string };
  productsServices?: { productCode: string; productDescription: string };
}

const emptyForm = {
  id: 0,
  code: '',
  tradename: '',
  genericName: '',
  dimension: '',
  costPrice: '',
  sellingPrice: '',
  wholesaleSellingPrice: '',
  minimumStock: 0,
  groupId: '',
  productModelId: '',
  unitMeasureId: '',
  productTypeId: '',
  activityId: '',
  productsServicesId: '',
  branchOfficeId: '1',
};

export function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [units, setUnits] = useState<UnitMeasure[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [services, setServices] = useState<ProductsServices[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [models, setModels] = useState<ProductModel[]>([]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await apiGet<Product[]>('/product');
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [u, a, s, g, t, m] = await Promise.all([
        apiGet<UnitMeasure[]>('/catalog/unit_measure/get_list_enabled'),
        apiGet<Activity[]>('/catalog/activity/get_list_enabled'),
        apiGet<ProductsServices[]>('/catalog/products_services/get_list_enabled'),
        apiGet<Group[]>('/catalog/group/get_list_enabled'),
        apiGet<ProductType[]>('/catalog/product_type/get_list_enabled'),
        apiGet<ProductModel[]>('/catalog/product_model/get_list_enabled'),
      ]);
      setUnits(u);
      setActivities(a);
      setServices(s);
      setGroups(g);
      setTypes(t);
      setModels(m);
    } catch (err: any) {
      setError(err.message || 'Error al cargar catálogos');
    }
  };

  useEffect(() => {
    loadProducts();
    loadCatalogs();
  }, []);

  function openCreate(): void {
    setForm(emptyForm);
    setModalMode('create');
    setShowModal(true);
  }

  function openEdit(p: Product): void {
    setForm({
      id: p.id,
      code: p.code,
      tradename: p.tradename,
      genericName: p.genericName,
      dimension: p.dimension ?? '',
      costPrice: p.costPrice ?? '',
      sellingPrice: p.sellingPrice ?? '',
      wholesaleSellingPrice: p.wholesaleSellingPrice ?? '',
      minimumStock: p.minimumStock,
      groupId: String(p.groupId ?? ''),
      productModelId: String(p.productModelId ?? ''),
      unitMeasureId: String(p.unitMeasureId ?? ''),
      productTypeId: String(p.productTypeId ?? ''),
      activityId: String(p.activityId ?? ''),
      productsServicesId: String(p.productsServicesId ?? ''),
      branchOfficeId: String(p.branchOfficeId ?? '1'),
    });
    setModalMode('edit');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      id: form.id,
      code: form.code.trim(),
      tradename: form.tradename.trim(),
      genericName: form.genericName.trim(),
      dimension: form.dimension.trim(),
      costPrice: Number(form.costPrice || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      wholesaleSellingPrice: Number(form.wholesaleSellingPrice || 0),
      minimumStock: Number(form.minimumStock || 0),
      groupId: Number(form.groupId),
      productModelId: Number(form.productModelId),
      unitMeasureId: Number(form.unitMeasureId),
      productTypeId: Number(form.productTypeId),
      activityId: Number(form.activityId),
      productsServicesId: Number(form.productsServicesId),
      settingTableId: 1,
      userId: 1,
      branchOfficeId: Number(form.branchOfficeId),
      registrationDate: new Date(),
      modificationDate: new Date(),
      state: 1,
    };
    try {
      if (modalMode === 'create') {
        const { id, ...data } = payload;
        await apiPost('/product/store', data);
      } else {
        await apiPut('/product/update', payload);
      }
      setShowModal(false);
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  }

  async function toggleState(p: Product): Promise<void> {
    setError(null);
    try {
      if (p.state === 1) {
        await apiPut('/product/disable', { id: p.id });
      } else {
        await apiPut('/product/enable', { id: p.id });
      }
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado');
    }
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Productos / Servicios</h3>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          Nuevo Producto
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
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Genérico</th>
                  <th>Grupo</th>
                  <th>Unidad</th>
                  <th>Actividad</th>
                  <th>P. Costo</th>
                  <th>P. Venta</th>
                  <th>Stock Mín</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.code}</code></td>
                    <td>{p.tradename}</td>
                    <td>{p.genericName}</td>
                    <td>{p.group?.name || '-'}</td>
                    <td>{p.unitMeasure?.description || '-'}</td>
                    <td>{p.activity?.description || '-'}</td>
                    <td>{Number(p.costPrice).toFixed(2)}</td>
                    <td>{Number(p.sellingPrice).toFixed(2)}</td>
                    <td>{p.minimumStock}</td>
                    <td>
                      <span className={`badge ${p.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                        {p.state === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => toggleState(p)}>
                        {p.state === 1 ? 'Deshabilitar' : 'Habilitar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center">Sin productos registrados</td>
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
              <h4>{modalMode === 'create' ? 'Nuevo' : 'Editar'} Producto / Servicio</h4>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <label className="field">
                    <span>Código *</span>
                    <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Nombre comercial *</span>
                    <input className="input" value={form.tradename} onChange={(e) => setForm({ ...form, tradename: e.target.value })} required />
                  </label>
                  <label className="field">
                    <span>Nombre genérico</span>
                    <input className="input" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Dimensión</span>
                    <input className="input" value={form.dimension} onChange={(e) => setForm({ ...form, dimension: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Precio costo (Bs)</span>
                    <input type="number" step="0.01" className="input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Precio venta (Bs)</span>
                    <input type="number" step="0.01" className="input" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Precio por mayor (Bs)</span>
                    <input type="number" step="0.01" className="input" value={form.wholesaleSellingPrice} onChange={(e) => setForm({ ...form, wholesaleSellingPrice: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Stock mínimo</span>
                    <input type="number" className="input" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} />
                  </label>
                  <label className="field">
                    <span>Grupo *</span>
                    <select className="input" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} required>
                      <option value="">Seleccione...</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Tipo *</span>
                    <select className="input" value={form.productTypeId} onChange={(e) => setForm({ ...form, productTypeId: e.target.value })} required>
                      <option value="">Seleccione...</option>
                      {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Modelo *</span>
                    <select className="input" value={form.productModelId} onChange={(e) => setForm({ ...form, productModelId: e.target.value })} required>
                      <option value="">Seleccione...</option>
                      {models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Unidad de medida *</span>
                    <select className="input" value={form.unitMeasureId} onChange={(e) => setForm({ ...form, unitMeasureId: e.target.value })} required>
                      <option value="">Seleccione...</option>
                      {units.map((u) => <option key={u.id} value={u.id}>{u.description}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Actividad económica *</span>
                    <select
                      className="input"
                      value={form.activityId}
                      onChange={(e) => setForm({ ...form, activityId: e.target.value, productsServicesId: '' })}
                      required
                    >
                      <option value="">Seleccione...</option>
                      {activities.map((a) => <option key={a.id} value={a.id}>{a.description}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Producto/Servicio SIAT *</span>
                    <select
                      className="input"
                      value={form.productsServicesId}
                      onChange={(e) => setForm({ ...form, productsServicesId: e.target.value })}
                      required
                      disabled={!form.activityId}
                    >
                      <option value="">Seleccione...</option>
                      {services
                        .filter((s) => Number(s.activityId) === Number(form.activityId))
                        .map((s) => <option key={s.id} value={s.id}>{s.productCode} - {s.productDescription}</option>)}
                      {services.filter((s) => Number(s.activityId) === Number(form.activityId)).length === 0 && (
                        <option value="">Sin productos para esta actividad</option>
                      )}
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