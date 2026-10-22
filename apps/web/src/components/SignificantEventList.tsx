import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import { SignificantEvent, ReasonEvent, Contingency, Invoice } from '../types';

interface SignificantEventListProps {
  branches: { id: number; name: string; code: number }[];
  pointsSale: { id: number; pointSaleCode: number; pointSaleName: string; branchOfficeId: number }[];
}

export function SignificantEventList({ branches, pointsSale }: SignificantEventListProps) {
  const [events, setEvents] = useState<SignificantEvent[]>([]);
  const [reasonEvents, setReasonEvents] = useState<ReasonEvent[]>([]);
  const [contingencies, setContingencies] = useState<Contingency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<SignificantEvent | null>(null);
  const [sendModalId, setSendModalId] = useState<number | null>(null);
  const [linkModalId, setLinkModalId] = useState<number | null>(null);
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    reasonEventId: '',
    startDate: '',
    endDate: '',
    cufdEvent: '',
    branchOfficeId: '',
    pointSaleId: '',
    sectorDocumentId: '',
    contingencyId: '',
  });

  useEffect(() => {
    loadEvents();
    loadReasonEvents();
    loadContingencies();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await apiGet<SignificantEvent[]>('/significant-event/get_list_enabled');
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar eventos significativos');
    } finally {
      setLoading(false);
    }
  };

  const loadReasonEvents = async () => {
    try {
      const data = await apiGet<ReasonEvent[]>('/significant-event/get_reason_events');
      setReasonEvents(data);
    } catch {
      // ignore
    }
  };

  const loadContingencies = async () => {
    try {
      const data = await apiGet<Contingency[]>('/significant-event/get_contingencies');
      setContingencies(data);
    } catch {
      // ignore
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormData({
      reasonEventId: '',
      startDate: '',
      endDate: '',
      cufdEvent: '',
      branchOfficeId: '',
      pointSaleId: '',
      sectorDocumentId: '',
      contingencyId: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: SignificantEvent) => {
    setModalMode('edit');
    setEditingItem(item);
    const linkedContingency = item.contingencies?.[0]?.contingencyId;
    setFormData({
      reasonEventId: String(item.reasonEventId),
      startDate: item.startDate?.split('T')[0] || '',
      endDate: item.endDate?.split('T')[0] || '',
      cufdEvent: item.cufdEvent || '',
      branchOfficeId: String(item.branchOfficeId),
      pointSaleId: String(item.pointSaleId),
      sectorDocumentId: String(item.sectorDocumentId ?? ''),
      contingencyId: linkedContingency ? String(linkedContingency) : '',
    });
    setShowModal(true);
  };

  const openLinkModal = async (eventId: number) => {
    setLinkModalId(eventId);
    setSelectedInvoiceIds([]);
    try {
      const data = await apiGet<Invoice[]>('/significant-event/get_available_invoices');
      setAvailableInvoices(data);
    } catch {
      setAvailableInvoices([]);
    }
  };

  const handleLinkInvoices = async () => {
    if (!linkModalId || selectedInvoiceIds.length === 0) return;
    try {
      await apiPost(`/significant-event/${linkModalId}/link-invoices`, {
        invoiceIds: selectedInvoiceIds,
      });
      setLinkModalId(null);
      loadEvents();
    } catch (err: any) {
      setError(err.message || 'Error al vincular facturas');
    }
  };

  const handleUnlinkInvoice = async (eventId: number, invoiceId: number) => {
    try {
      await apiPost(`/significant-event/${eventId}/unlink-invoices`, {
        invoiceIds: [invoiceId],
      });
      loadEvents();
    } catch (err: any) {
      setError(err.message || 'Error al desvincular factura');
    }
  };

  const handleFormDataChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'branchOfficeId') {
      setFormData((prev) => ({ ...prev, pointSaleId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (modalMode === 'create') {
        await apiPost('/significant-event/store', {
          reasonEventId: Number(formData.reasonEventId),
          startDate: formData.startDate,
          endDate: formData.endDate,
          cufdEvent: formData.cufdEvent || null,
          branchOfficeId: Number(formData.branchOfficeId),
          pointSaleId: Number(formData.pointSaleId),
          sectorDocumentId: formData.sectorDocumentId ? Number(formData.sectorDocumentId) : undefined,
          contingencyId: formData.contingencyId ? Number(formData.contingencyId) : undefined,
        });
      } else if (editingItem) {
        await apiPut(`/significant-event/${editingItem.id}`, {
          startDate: formData.startDate,
          endDate: formData.endDate,
          cufdEvent: formData.cufdEvent || undefined,
          sectorDocumentId: formData.sectorDocumentId ? Number(formData.sectorDocumentId) : undefined,
        });
      }
      setShowModal(false);
      loadEvents();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este evento significativo?')) return;
    try {
      await apiDelete(`/significant-event/${id}`);
      loadEvents();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const handleSendInvoices = async (id: number) => {
    if (!confirm('¿Enviar facturas pendientes de este evento significativo?')) return;
    try {
      const res = await apiPost<{ transaccion: boolean; mensaje: string }>(
        '/significant-event/send_invoice_significant_event',
        { id },
      );
      alert(res.mensaje || (res.transaccion ? 'Facturas sincronizadas' : 'Error'));
      setSendModalId(null);
      loadEvents();
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar facturas');
    }
  };

  const filteredPointsSale = pointsSale.filter((p) => Number(p.branchOfficeId) === Number(formData.branchOfficeId));

  return (
    <div className="card">
      <div className="card-header">
        <h3>Eventos Significativos</h3>
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          Nuevo Evento Significativo
        </button>
      </div>
      <div className="card-body">
        {error && <div className="error-text">{error}</div>}
        {loading ? (
          <div className="text-center p-4">Cargando…</div>
        ) : events.length === 0 ? (
          <div className="text-center p-4">Sin eventos significativos activos</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Número</th>
                  <th>Motivo Evento</th>
                  <th>CAFC</th>
                  <th>Facturas</th>
                  <th>Paquetes</th>
                  <th>Fecha Inicio</th>
                  <th>Fecha Fin</th>
                  <th>CUFD Evento</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {events.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td><code>{item.number}</code></td>
                    <td>{item.reasonEvent?.description ?? item.reasonEventCode ?? '-'}</td>
                    <td><code>{item.contingencies?.[0]?.contingency?.cafc ?? '-'}</code></td>
                    <td>
                      <span className="badge badge-info">{item.invoices?.length ?? 0}</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => openLinkModal(item.id)}>Vincular</button>
                    </td>
                    <td>
                      <span className="badge badge-warning">{item.packageReceptions?.length ?? 0}</span>
                    </td>
                    <td>{item.startDate?.split('T')[0]}</td>
                    <td>{item.endDate?.split('T')[0]}</td>
                    <td><code>{item.cufdEvent ?? '-'}</code></td>
                    <td>
                      <span className={`badge ${item.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                        {item.state === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Eliminar</button>
                      <button className="btn btn-info btn-sm" onClick={() => handleSendInvoices(item.id)}>Enviar Facturas</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{modalMode === 'create' ? 'Crear' : 'Editar'} Evento Significativo</h4>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <label className="field">
                    <span>Motivo Evento *</span>
                    <select className="input" value={formData.reasonEventId} onChange={e => handleFormDataChange('reasonEventId', e.target.value)} required>
                      <option value="">Seleccione...</option>
                      {reasonEvents.map(r => <option key={r.id} value={r.id}>{r.description}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>CAFC (Contingencia)</span>
                    <select className="input" value={formData.contingencyId} onChange={e => handleFormDataChange('contingencyId', e.target.value)}>
                      <option value="">Sin CAFC</option>
                      {contingencies.map(c => <option key={c.id} value={c.id}>{c.cafc}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-2">
                  <label className="field">
                    <span>Fecha Inicio *</span>
                    <input type="date" className="input" value={formData.startDate} onChange={e => handleFormDataChange('startDate', e.target.value)} required />
                  </label>
                </div>
                <div className="grid grid-2">
                  <label className="field">
                    <span>Fecha Fin *</span>
                    <input type="date" className="input" value={formData.endDate} onChange={e => handleFormDataChange('endDate', e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>CUFD Evento</span>
                    <input className="input" value={formData.cufdEvent} onChange={e => handleFormDataChange('cufdEvent', e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-2">
                  <label className="field">
                    <span>Sucursal *</span>
                    <select className="input" value={formData.branchOfficeId} onChange={e => handleFormDataChange('branchOfficeId', e.target.value)} required>
                      <option value="">Seleccione...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Punto de Venta *</span>
                    <select className="input" value={formData.pointSaleId} onChange={e => handleFormDataChange('pointSaleId', e.target.value)} required disabled={!formData.branchOfficeId}>
                      <option value="">Seleccione...</option>
                      {filteredPointsSale.map(p => <option key={p.id} value={p.id}>{p.pointSaleName} ({p.pointSaleCode})</option>)}
                    </select>
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

      {/* Link Invoices Modal */}
      {linkModalId && (
        <div className="modal-overlay" onClick={() => setLinkModalId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Vincular Facturas al Evento Significativo</h4>
              <button className="btn-close" onClick={() => setLinkModalId(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {availableInvoices.length === 0 ? (
                <p>No hay facturas disponibles para vincular</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th><input type="checkbox" onChange={e => {
                          if (e.target.checked) {
                            setSelectedInvoiceIds(availableInvoices.map(i => i.id));
                          } else {
                            setSelectedInvoiceIds([]);
                          }
                        }} /></th>
                        <th>Número</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado Sync</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedInvoiceIds.includes(inv.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedInvoiceIds(prev => [...prev, inv.id]);
                                } else {
                                  setSelectedInvoiceIds(prev => prev.filter(id => id !== inv.id));
                                }
                              }}
                            />
                          </td>
                          <td>{inv.invoiceNumFormat || inv.invoiceNum}</td>
                          <td>{inv.customerName}</td>
                          <td>{inv.total}</td>
                          <td>
                            <span className={`badge ${inv.synchronizedSiat === 1 ? 'badge-success' : 'badge-warning'}`}>
                              {inv.synchronizedSiat === 1 ? 'Sincronizado' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setLinkModalId(null)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLinkInvoices}
                disabled={selectedInvoiceIds.length === 0}
              >
                Vincular ({selectedInvoiceIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignificantEventList;
