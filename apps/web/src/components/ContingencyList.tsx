import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import { Contingency, Activity, SectorDocument, BranchOffice } from '../types';

interface ContingencyListProps {
  branches: BranchOffice[];
}

export function ContingencyList({ branches }: ContingencyListProps) {
  const [items, setItems] = useState<Contingency[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sectorDocuments, setSectorDocuments] = useState<SectorDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<Contingency | null>(null);
  const [viewItem, setViewItem] = useState<Contingency | null>(null);

  const [formData, setFormData] = useState({
    cafc: '',
    amount: '',
    effectiveDate: '',
    activityId: '',
    sectorDocumentId: '',
    branchOfficeId: '',
  });

  useEffect(() => {
    loadItems();
    loadActivities();
    loadSectorDocuments();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Contingency[]>('/contingency/get_list_enabled');
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar contingencias');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const data = await apiGet<Activity[]>('/catalog/activity/get_list_enabled');
      setActivities(data);
    } catch { /* ignore */ }
  };

  const loadSectorDocuments = async () => {
    try {
      const data = await apiGet<SectorDocument[]>('/catalog/sector_document/get_list_enabled');
      setSectorDocuments(data);
    } catch { /* ignore */ }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormData({
      cafc: '',
      amount: '',
      effectiveDate: '',
      activityId: activities[0]?.id ? String(activities[0].id) : '',
      sectorDocumentId: sectorDocuments[0]?.id ? String(sectorDocuments[0].id) : '',
      branchOfficeId: branches[0]?.id ? String(branches[0].id) : '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: Contingency) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormData({
      cafc: item.cafc,
      amount: String(item.amount),
      effectiveDate: item.effectiveDate?.split('T')[0] || '',
      activityId: String(item.activityId),
      sectorDocumentId: String(item.sectorDocumentId),
      branchOfficeId: String(item.branchOfficeId),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        cafc: formData.cafc,
        amount: Number(formData.amount),
        effectiveDate: formData.effectiveDate,
        activityId: Number(formData.activityId),
        sectorDocumentId: Number(formData.sectorDocumentId),
        branchOfficeId: Number(formData.branchOfficeId),
      };
      if (modalMode === 'create') {
        await apiPost('/contingency/store', payload);
      } else if (editingItem) {
        await apiPut(`/contingency/${editingItem.id}`, payload);
      }
      setShowModal(false);
      loadItems();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Deshabilitar esta contingencia?')) return;
    try {
      await apiDelete(`/contingency/${id}`);
      loadItems();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Contingencias (CAFC)</h3>
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          Nueva Contingencia
        </button>
      </div>
      <div className="card-body">
        {error && <div className="error-text">{error}</div>}
        {loading ? (
          <div className="text-center p-4">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="text-center p-4">Sin contingencias registradas</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Número</th>
                  <th>CAFC</th>
                  <th>Cantidad</th>
                  <th>Fecha Límite</th>
                  <th>Actividad</th>
                  <th>Doc. Sector</th>
                  <th>Sucursal</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.number}</td>
                    <td><code>{item.cafc}</code></td>
                    <td>{item.amount}</td>
                    <td>{item.effectiveDate?.split('T')[0]}</td>
                    <td>{item.activity?.description ?? item.activityId}</td>
                    <td>{item.sectorDocument?.description ?? item.sectorDocumentId}</td>
                    <td>{item.branchOffice?.name ?? item.branchOfficeId}</td>
                    <td>
                      <span className={`badge ${item.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                        {item.state === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-info btn-sm" onClick={() => setViewItem(item)}>Ver</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Deshabilitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{modalMode === 'create' ? 'Crear' : 'Editar'} Contingencia</h4>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <label className="field">
                    <span>Sucursal *</span>
                    <select className="input" value={formData.branchOfficeId} onChange={e => setFormData({...formData, branchOfficeId: e.target.value})} required>
                      <option value="">Seleccione...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Actividad *</span>
                    <select className="input" value={formData.activityId} onChange={e => setFormData({...formData, activityId: e.target.value})} required>
                      <option value="">Seleccione...</option>
                      {activities.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-2">
                  <label className="field">
                    <span>Documento Sector *</span>
                    <select className="input" value={formData.sectorDocumentId} onChange={e => setFormData({...formData, sectorDocumentId: e.target.value})} required>
                      <option value="">Seleccione...</option>
                      {sectorDocuments.map(s => <option key={s.id} value={s.id}>{s.description}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>CAFC *</span>
                    <input className="input" value={formData.cafc} onChange={e => setFormData({...formData, cafc: e.target.value})} required />
                  </label>
                </div>
                <div className="grid grid-2">
                  <label className="field">
                    <span>Cantidad *</span>
                    <input type="number" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                  </label>
                  <label className="field">
                    <span>Fecha Límite *</span>
                    <input type="date" className="input" value={formData.effectiveDate} onChange={e => setFormData({...formData, effectiveDate: e.target.value})} required />
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{modalMode === 'create' ? 'Crear' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Detalle de Contingencia</h4>
              <button className="btn-close" onClick={() => setViewItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2">
                <label className="field"><span>Sucursal</span><input className="input" value={viewItem.branchOffice?.name ?? ''} readOnly /></label>
                <label className="field"><span>Actividad</span><input className="input" value={viewItem.activity?.description ?? ''} readOnly /></label>
              </div>
              <div className="grid grid-2">
                <label className="field"><span>Documento Sector</span><input className="input" value={viewItem.sectorDocument?.description ?? ''} readOnly /></label>
                <label className="field"><span>CAFC</span><input className="input" value={viewItem.cafc} readOnly /></label>
              </div>
              <div className="grid grid-2">
                <label className="field"><span>Cantidad</span><input className="input" value={String(viewItem.amount)} readOnly /></label>
                <label className="field"><span>Fecha Límite</span><input className="input" value={viewItem.effectiveDate?.split('T')[0] || ''} readOnly /></label>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setViewItem(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContingencyList;
