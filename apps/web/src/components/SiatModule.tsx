import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';

interface SyncResponse {
  transaccion: boolean;
  mensaje?: string;
  codigos?: any[];
  actividades?: any[];
  productos?: any[];
  leyendas?: any[];
  mensajes?: { codigo?: string; descripcion?: string }[];
}

interface Cuis {
  id: number;
  code: string;
  startDate: string;
  effectiveDate: string;
  transaction: boolean;
  state: number;
  pointSaleId: number;
  branchOfficeId: number;
  pointSale?: { pointSaleName: string };
  branchOffice?: { name: string };
}

interface Cufd {
  id: number;
  code: string;
  controlCode: string;
  address: string;
  startDate: string;
  effectiveDate: string;
  effectiveDate2: string;
  effectiveDate3: string;
  transaction: boolean;
  state: number;
  state2: number;
  state3: number;
  cuisId: number;
  pointSaleId: number;
  branchOfficeId: number;
  cuis?: Cuis;
  pointSale?: { pointSaleName: string };
  branchOffice?: { name: string };
}

interface PointSale {
  id: number;
  pointSaleCode: number;
  pointSaleName: string;
  description?: string;
  pointSaleTypeName: string;
  state: number;
  pointSaleTypeId?: number;
  branchOfficeId: number;
  branchOffice?: { name: string };
}

interface BranchOffice {
  id: number;
  name: string;
  code: number;
}

interface PointSaleType {
  id: number;
  classifierCode: string;
  description: string;
}

interface Company {
  id: number;
  name: string;
  nameCompany: string;
  nit: string;
  environmentCode: number;
  modalityCode: number;
  systemCode: string;
}

export function SiatModule() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'cuis' | 'cufd' | 'puntos-venta' | 'catalogos' | 'token' | 'certificados'>('cuis');
  const [cuisList, setCuisList] = useState<Cuis[]>([]);
  const [cufdList, setCufdList] = useState<Cufd[]>([]);
  const [pointsSale, setPointsSale] = useState<PointSale[]>([]);
  const [branches, setBranches] = useState<BranchOffice[]>([]);
  const [pointSaleTypes, setPointSaleTypes] = useState<PointSaleType[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [certificados, setCertificados] = useState<{ directorio: string; certificados: any[]; empresa?: any } | null>(null);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [clavePrivadaFile, setClavePrivadaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);
const [formData, setFormData] = useState<{
    // CUIS
    code: string;
    startDate: string;
    effectiveDate: string;
    pointSaleId: string;
    branchOfficeId: string;
    // CUFD
    cuisId: string;
    controlCode: string;
    address: string;
    effectiveDate2: string;
    effectiveDate3: string;
    // Point Sale
    pointSaleCode: string;
    pointSaleName: string;
    pointSaleTypeId: string;
    description: string;
    // Token
    tokenValue: string;
    version: string;
    tokenEndDate: string;
  }>({
    // CUIS
    code: '',
    startDate: '',
    effectiveDate: '',
    pointSaleId: '',
    branchOfficeId: '',
    // CUFD
    cuisId: '',
    controlCode: '',
    address: '',
    effectiveDate2: '',
    effectiveDate3: '',
    // Point Sale
    pointSaleCode: '0',
    pointSaleName: '',
    pointSaleTypeId: '',
    description: '',
    // Token
    tokenValue: '',
    version: '2',
    tokenEndDate: '',
  });

  const [catalogTab, setCatalogTab] = useState('activity');
  const [catalogData, setCatalogData] = useState<any[]>([]);
  const [catalogCounts, setCatalogCounts] = useState<Record<string, number>>({});

  const CATALOGS = [
    { key: 'activity', label: 'Actividades', url: '/catalog/activity/get_list_enabled', cols: ['caebCode', 'description', 'activityType'] },
    { key: 'point_sale_type', label: 'Tipos Punto Venta', url: '/catalog/point_sale_type/get_list_enabled', cols: ['classifierCode', 'description'] },
    { key: 'sector_document', label: 'Documentos Sector', url: '/catalog/sector_document/get_list_enabled', cols: ['classifierCode', 'description'] },
    { key: 'products_services', label: 'Productos/Servicios', url: '/catalog/products_services/get_list_enabled', cols: ['activityCode', 'productCode', 'productDescription'] },
    { key: 'legend', label: 'Leyendas Factura', url: '/catalog/legend/get_list_enabled', cols: ['activityCode', 'legendDescription'] },
    { key: 'sector_document_activity', label: 'Actividades Doc. Sector', url: '/catalog/sector_document_activity/get_list_enabled', cols: ['activityCode', 'sectorDocumentCode', 'sectorDocumentType'] },
    { key: 'unit_measure', label: 'Unidades Medida', url: '/catalog/unit_measure/get_list_enabled', cols: ['classifierCode', 'description'] },
    { key: 'identity_document_type', label: 'Tipos Doc. Identidad', url: '/catalog/identity_document_type/get_list_enabled', cols: ['classifierCode', 'description'] },
    { key: 'payment_method_type', label: 'Métodos Pago', url: '/catalog/payment_method_type/get_list_enabled', cols: ['classifierCode', 'description'] },
    { key: 'currency', label: 'Monedas', url: '/catalog/currency/get_list_enabled', cols: ['classifierCode', 'description'] },
    { key: 'reason_cancellation', label: 'Motivos Anulación', url: '/catalog/reason_cancellation/get_list_enabled', cols: ['classifierCode', 'description'] },
    { key: 'type_invoice_document', label: 'Tipos Factura', url: '/catalog/type_invoice_document/get_list_enabled', cols: ['classifierCode', 'description'] },
    { key: 'reason_event', label: 'Motivos Evento', url: '/catalog/reason_event/get_list_enabled', cols: ['classifierCode', 'description'] },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (tab === 'cuis') loadCuis();
    else if (tab === 'cufd') { loadCufd(); loadCuis(); loadPointsSale(); }
    else if (tab === 'puntos-venta') loadPointsSale();
    else if (tab === 'token') loadTokens();
    else if (tab === 'certificados') loadCertificados();
    else if (tab === 'catalogos') {
      loadAllCatalogCounts();
      loadCatalog(catalogTab);
    }
  }, [tab, catalogTab]);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const data = await apiGet<Company>('/company/get_company');
        setCompany(data);
      } catch (err: any) {
        console.error('Error loading company:', err);
      }
    };
    loadCompany();
  }, []);

  const loadInitialData = async () => {
    try {
      const [branchesData, typesData] = await Promise.all([
        apiGet<BranchOffice[]>('/branch_office/get_list_enabled'),
        apiGet<PointSaleType[]>('/catalog/point_sale_type/get_list_enabled'),
      ]);
      setBranches(branchesData);
      setPointSaleTypes(typesData);
    } catch (err: any) {
      setError('Error al cargar datos iniciales');
    }
  };

  const loadCuis = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Cuis[]>('/catalog/cuis/get_list_enabled');
      setCuisList(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar CUIS');
    } finally {
      setLoading(false);
    }
  };

  const loadCufd = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Cufd[]>('/catalog/cufd/get_list_enabled');
      setCufdList(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar CUFD');
    } finally {
      setLoading(false);
    }
  };

  const loadPointsSale = async () => {
    setLoading(true);
    try {
      const data = await apiGet<PointSale[]>('/catalog/point_sale/get_list_enabled');
      setPointsSale(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar Puntos de Venta');
    } finally {
      setLoading(false);
    }
  };

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await apiGet<any[]>('/token');
      setTokens(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar Tokens');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificados = async () => {
    setLoading(true);
    try {
      const data = await apiGet<any>('/siat/certificados');
      setCertificados(data);
    } catch (err: any) {
      setError(err.message || 'Error al verificar certificados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubirCertificados = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certificadoFile && !clavePrivadaFile) {
      setError('Seleccione al menos un archivo');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      if (certificadoFile) fd.append('certificado', certificadoFile);
      if (clavePrivadaFile) fd.append('clavePrivada', clavePrivadaFile);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/siat/certificados', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      alert(data.mensaje || 'Certificados registrados');
      setCertificadoFile(null);
      setClavePrivadaFile(null);
      loadCertificados();
    } catch (err: any) {
      setError(err.message || 'Error al registrar certificados');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async (key: string) => {
    const cat = CATALOGS.find(c => c.key === key);
    if (!cat) return;
    setLoading(true);
    try {
      const data = await apiGet<any[]>(cat.url);
      setCatalogData(data);
    } catch (err: any) {
      setError(err.message || `Error al cargar ${cat.label}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCatalogCounts = async () => {
    try {
      const counts: Record<string, number> = {};
      for (const cat of CATALOGS) {
        try {
          const data = await apiGet<any[]>(cat.url);
          counts[cat.key] = data.length;
        } catch {
          counts[cat.key] = 0;
        }
      }
      setCatalogCounts(counts);
    } catch (err: any) {
      console.error('Error cargando conteos', err);
    }
  };

  const openCreateModal = (type: string) => {
    setModalMode('create');
    setEditingItem(null);
    setFormData({
      code: '',
      startDate: new Date().toISOString().split('T')[0],
      effectiveDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pointSaleId: '',
      branchOfficeId: String(branches[0]?.id || ''),
      cuisId: '',
      controlCode: '',
      address: (branches[0] as any)?.address || '',
      effectiveDate2: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      effectiveDate3: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0],
      pointSaleCode: '0',
      pointSaleName: '',
      pointSaleTypeId: String(pointSaleTypes[0]?.id || ''),
      description: '',
      tokenValue: '',
      version: '2',
      tokenEndDate: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalMode('edit');
    setEditingItem(item);
    if (tab === 'cuis') {
      setFormData({
        code: item.code,
        startDate: item.startDate?.split('T')[0] || '',
        effectiveDate: item.effectiveDate?.split('T')[0] || '',
        pointSaleId: item.pointSaleId || '',
        branchOfficeId: item.branchOfficeId || '',
        cuisId: '',
        controlCode: '',
        address: '',
        effectiveDate2: '',
        effectiveDate3: '',
        pointSaleCode: '0',
        pointSaleName: '',
        pointSaleTypeId: '',
        description: '',
        tokenValue: '',
        version: '2',
        tokenEndDate: '',
      });
    } else if (tab === 'cufd') {
      setFormData({
        code: item.code,
        startDate: item.startDate?.split('T')[0] || '',
        effectiveDate: item.effectiveDate?.split('T')[0] || '',
        effectiveDate2: item.effectiveDate2?.split('T')[0] || '',
        effectiveDate3: item.effectiveDate3?.split('T')[0] || '',
        controlCode: item.controlCode,
        address: item.address,
        cuisId: item.cuisId || '',
        pointSaleId: item.pointSaleId || '',
        branchOfficeId: item.branchOfficeId || '',
        pointSaleCode: '0',
        pointSaleName: '',
        pointSaleTypeId: '',
        description: '',
        tokenValue: '',
        version: '2',
        tokenEndDate: '',
      });
    } else if (tab === 'puntos-venta') {
      setFormData({
        pointSaleCode: item.pointSaleCode,
        pointSaleName: item.pointSaleName,
        pointSaleTypeId: item.pointSaleTypeId || '',
        description: item.description || '',
        branchOfficeId: item.branchOfficeId || '',
        pointSaleId: '', // Add required field
        code: '',
        startDate: '',
        effectiveDate: '',
        effectiveDate2: '',
        effectiveDate3: '',
        controlCode: '',
        address: '',
        cuisId: '',
        tokenValue: '',
        version: '2',
        tokenEndDate: '',
      });
    } else if (tab === 'token') {
      setFormData({
        tokenValue: item.value,
        version: String(item.version ?? 2),
        tokenEndDate: item.endDate?.split('T')[0] || '',
        code: '',
        startDate: '',
        effectiveDate: '',
        effectiveDate2: '',
        effectiveDate3: '',
        controlCode: '',
        address: '',
        cuisId: '',
        pointSaleId: '',
        branchOfficeId: '',
        pointSaleCode: '0',
        pointSaleName: '',
        pointSaleTypeId: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (tab === 'cuis') {
        if (modalMode === 'create') {
          await apiPost('/siat/cuis', {
            point_sale_id: Number(formData.pointSaleId),
            branch_office_id: Number(formData.branchOfficeId),
          });
        } else {
          await apiPut(`/siat/cuis/${editingItem.id}`, {
            point_sale_id: Number(formData.pointSaleId),
            branch_office_id: Number(formData.branchOfficeId),
          });
        }
        loadCuis();
      } else if (tab === 'cufd') {
        if (modalMode === 'create') {
          await apiPost('/siat/cufd', {
            cuis_id: Number(formData.cuisId),
            point_sale_id: Number(formData.pointSaleId),
            branch_office_id: Number(formData.branchOfficeId),
          });
        } else {
          await apiPut(`/siat/cufd/${editingItem.id}`, {
            cuis_id: Number(formData.cuisId),
            point_sale_id: Number(formData.pointSaleId),
            branch_office_id: Number(formData.branchOfficeId),
          });
        }
        loadCufd();
      } else if (tab === 'puntos-venta') {
        if (modalMode === 'create') {
          await apiPost('/catalog/point_sale/store', {
            ...formData,
            pointSaleCode: Number(formData.pointSaleCode),
            pointSaleTypeId: Number(formData.pointSaleTypeId),
            branchOfficeId: Number(formData.branchOfficeId),
            state: 1,
          });
        } else {
          await apiPut(`/catalog/point_sale/update`, {
            ...formData,
            id: editingItem.id,
            pointSaleCode: Number(formData.pointSaleCode),
            pointSaleTypeId: Number(formData.pointSaleTypeId),
            branchOfficeId: Number(formData.branchOfficeId),
          });
        }
        loadPointsSale();
      } else if (tab === 'token') {
        if (modalMode === 'create') {
          await apiPost('/token/store', {
            value: formData.tokenValue,
            version: Number(formData.version),
            endDate: formData.tokenEndDate ? new Date(formData.tokenEndDate).toISOString() : undefined,
          });
        } else {
          await apiPut('/token/update', {
            id: editingItem.id,
            value: formData.tokenValue,
            version: Number(formData.version),
            endDate: formData.tokenEndDate ? new Date(formData.tokenEndDate).toISOString() : undefined,
          });
        }
        loadTokens();
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      if (tab === 'cuis') {
        await apiDelete(`/siat/cuis/${id}`);
        loadCuis();
      } else if (tab === 'cufd') {
        await apiDelete(`/siat/cufd/${id}`);
        loadCufd();
      } else if (tab === 'puntos-venta') {
        await apiDelete(`/catalog/point_sale/${id}`);
        loadPointsSale();
      } else if (tab === 'token') {
        await apiPut('/token/disable', { id });
        loadTokens();
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const handleSincronizarPuntosVenta = async () => {
    try {
      setLoading(true);
      const res = await apiGet<SyncResponse>('/siat/sincronizar_puntos_venta');
      alert(res.transaccion ? 'Puntos de venta sincronizados' : `Error: ${res.mensajes?.[0]?.descripcion || 'Desconocido'}`);
      loadPointsSale();
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar puntos de venta');
    } finally {
      setLoading(false);
    }
  };

const handleVerificarComunicacion = async () => {
  try {
    const res = await apiGet<SyncResponse>('/siat/verificar_comunicacion');
    alert(`Comunicación: ${res.mensaje || (res.transaccion ? 'EXITOSA' : 'FALLIDA')}`);
  } catch (err: any) {
    setError(err.message || 'Error al verificar comunicación');
  }
};

const handleSincronizarTodo = async () => {
  try {
    setLoading(true);
    const res = await apiPost<SyncResponse>('/siat/sincronizar_parametros_siat', {});
    alert(res.mensaje || (res.transaccion ? 'Sincronización completa exitosa' : 'Error en sincronización'));
    loadCuis();
    loadCufd();
    loadPointsSale();
    loadAllCatalogCounts();
  } catch (err: any) {
    setError(err.message || 'Error en sincronización completa');
  } finally {
    setLoading(false);
  }
};


  const handleSincronizarActividades = async () => {
    try {
      setLoading(true);
      const res = await apiGet<SyncResponse>('/siat/sincronizar_actividades');
      alert(res.transaccion ? 'Actividades sincronizadas' : `Error: ${res.mensajes?.[0]?.descripcion || 'Desconocido'}`);
      loadCuis();
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar actividades');
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizarProductos = async () => {
    try {
      setLoading(true);
      const res = await apiGet<SyncResponse>('/siat/sincronizar_productos');
      alert(res.transaccion ? 'Productos sincronizados' : `Error: ${res.mensajes?.[0]?.descripcion || 'Desconocido'}`);
      loadCufd();
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizarTipoDocumentoSector = async () => {
    try {
      setLoading(true);
      const res = await apiGet<SyncResponse>('/siat/sincronizar_tipo_documento_sector');
      alert(res.transaccion ? 'Tipos de documento sector sincronizados' : `Error: ${res.mensajes?.[0]?.descripcion || 'Desconocido'}`);
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar tipo documento sector');
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizarActividadesDocumentoSector = async () => {
    try {
      setLoading(true);
      const res = await apiGet<SyncResponse>('/siat/sincronizar_actividades_documento_sector');
      alert(res.transaccion ? 'Actividades documento sector sincronizadas' : `Error: ${res.mensajes?.[0]?.descripcion || 'Desconocido'}`);
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar actividades documento sector');
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizarLeyendasFactura = async () => {
    try {
      setLoading(true);
      const res = await apiGet<SyncResponse>('/siat/sincronizar_leyendas_factura');
      alert(res.transaccion ? 'Leyendas factura sincronizadas' : `Error: ${res.mensajes?.[0]?.descripcion || 'Desconocido'}`);
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar leyendas factura');
    } finally {
      setLoading(false);
    }
  }; 
  
  const handleSincronizarEventosSignificativos = async () => {
    try {
      setLoading(true);
      const res = await apiGet<SyncResponse>('/siat/sincronizar_eventos_significativos');
      alert(res.transaccion ? 'Eventos significativos sincronizados' : `Error: ${res.mensajes?.[0]?.descripcion || 'Desconocido'}`);
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar eventos significativos');
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizarParametricas = async () => {
    try {
      setLoading(true);
      const calls = [
      { label: 'Tipos Factura', url: '/siat/sincronizar_tipos_factura' },
      { label: 'Motivo Anulación', url: '/siat/sincronizar_motivo_anulacion' },
      { label: 'Tipo Método Pago', url: '/siat/sincronizar_tipo_metodo_pago' },
      { label: 'Tipo Moneda', url: '/siat/sincronizar_tipo_moneda' },
      { label: 'Unidad Medida', url: '/siat/sincronizar_unidad_medida' },
      { label: 'Tipo Doc. Identidad', url: '/siat/sincronizar_tipo_documento_identidad' },
      { label: 'Tipo Punto Venta', url: '/siat/sincronizar_tipo_punto_venta' },
      { label: 'Tipo Doc. Sector', url: '/siat/sincronizar_tipo_documento_sector' },
      { label: 'Actividades Doc. Sector', url: '/siat/sincronizar_actividades_documento_sector' },
      { label: 'Leyendas Factura', url: '/siat/sincronizar_leyendas_factura' },
      { label: 'Actividades', url: '/siat/sincronizar_actividades' },
      { label: 'Productos/Servicios', url: '/siat/sincronizar_productos' },
      { label: 'Motivos Evento', url: '/siat/sincronizar_eventos_significativos' },
    ];
    for (const call of calls) {
      const res = await apiGet<SyncResponse>(call.url);
      if (!res.transaccion) {
        alert(`${call.label}: ${res.mensajes?.[0]?.descripcion || 'Error'}`);
      }
    }
    alert('Sincronización de parámetros completada');
    loadCuis();
    loadCufd();
    loadPointsSale();
    loadAllCatalogCounts();
  } catch (err: any) {
    setError(err.message || 'Error al sincronizar parámetros');
  } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3>Módulo SIAT</h3>
            {company && (
              <div className="company-info" style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e2e6ec' }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <strong>Empresa:</strong> {company.nameCompany}
                  </div>
                  <div>
                    <strong>NIT:</strong> {company.nit}
                  </div>
                  <div>
                    <strong>Ambiente:</strong> {company.environmentCode === 2 ? 'Piloto' : company.environmentCode === 1 ? 'Producción' : 'Desconocido'} (Código: {company.environmentCode})
                  </div>
                  <div>
                    <strong>Modalidad:</strong> {company.modalityCode === 1 ? 'Electrónica en Línea' : company.modalityCode === 2 ? 'Computarizada en Línea' : 'Desconocida'} (Código: {company.modalityCode})
                  </div>
                  <div>
                    <strong>Sistema:</strong> {company.systemCode}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleVerificarComunicacion}>
            Verificar Comunicación
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSincronizarTodo} disabled={loading}>
            Sincronizar Todo
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSincronizarActividades} disabled={loading}>
            Sinc. Actividades
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSincronizarProductos} disabled={loading}>
            Sinc. Productos
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSincronizarPuntosVenta} disabled={loading}>
            Sinc. Puntos Venta
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSincronizarTipoDocumentoSector} disabled={loading}>
            Sinc. Tipo Doc. Sector
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSincronizarActividadesDocumentoSector} disabled={loading}>
            Sinc. Actividades Doc. Sector
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSincronizarLeyendasFactura} disabled={loading}>
            Sinc. Leyendas Factura
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSincronizarEventosSignificativos} disabled={loading}>
            Sinc. Motivos Evento
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSincronizarParametricas} disabled={loading}>
            Sinc. Parámetros
          </button>
        </div>
      </div>
    </div>
      <div className="card-body">
        {error && <div className="error-text">{error}</div>}

        <div className="tabs" style={{ marginBottom: '16px' }}>
          <button className={`tab ${tab === 'cuis' ? 'active' : ''}`} onClick={() => setTab('cuis')}>
            CUIS
          </button>
          <button className={`tab ${tab === 'cufd' ? 'active' : ''}`} onClick={() => setTab('cufd')}>
            CUFD
          </button>
          <button className={`tab ${tab === 'puntos-venta' ? 'active' : ''}`} onClick={() => setTab('puntos-venta')}>
            Puntos de Venta
          </button>
          <button className={`tab ${tab === 'token' ? 'active' : ''}`} onClick={() => setTab('token')}>
            Token
          </button>
          <button className={`tab ${tab === 'certificados' ? 'active' : ''}`} onClick={() => setTab('certificados')}>
            Certificados
          </button>
          <button className={`tab ${tab === 'catalogos' ? 'active' : ''}`} onClick={() => setTab('catalogos')}>
            Catálogos
          </button>
        </div>

{tab === 'cuis' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4>CUIS (Código Único de Identificación del Sistema)</h4>
              <button className="btn btn-primary btn-sm" onClick={() => openCreateModal('cuis')}>
                Nuevo CUIS
              </button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Código</th>
                    <th>Punto de Venta</th>
                    <th>Sucursal</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cuisList.map(item => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td><code>{item.code}</code></td>
                      <td>{item.pointSale?.pointSaleName || item.pointSaleId}</td>
                      <td>{item.branchOffice?.name || item.pointSaleId}</td>
                      <td>{item.startDate?.split('T')[0]}</td>
                      <td>{item.effectiveDate?.split('T')[0]}</td>
                      <td>
                        <span className={`badge ${item.transaction ? 'badge-success' : 'badge-neutral'}`}>
                          {item.transaction ? 'Vigente' : 'No vigente'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'cufd' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4>CUFD (Código Único de Facturación Diaria)</h4>
              <button className="btn btn-primary btn-sm" onClick={() => openCreateModal('cufd')}>
                Nuevo CUFD
              </button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Código</th>
                    <th>Código Control</th>
                    <th>CUIS</th>
                    <th>Punto de Venta</th>
                    <th>Sucursal</th>
                    <th>Fecha Inicio</th>
                    <th>Vigencia 1</th>
                    <th>Vigencia 2</th>
                    <th>Vigencia 3</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cufdList.map(item => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td><code>{item.code}</code></td>
                      <td><code>{item.controlCode}</code></td>
                      <td>{item.cuis?.code || item.cuisId}</td>
                      <td>{item.pointSale?.pointSaleName || item.pointSaleId}</td>
                      <td>{item.branchOffice?.name || item.branchOfficeId}</td>
                      <td>{item.startDate?.split('T')[0]}</td>
                      <td>{item.effectiveDate?.split('T')[0]}</td>
                      <td>{item.effectiveDate2?.split('T')[0]}</td>
                      <td>{item.effectiveDate3?.split('T')[0]}</td>
                      <td>
                        <span className={`badge ${item.transaction ? 'badge-success' : 'badge-neutral'}`}>
                          {item.transaction ? 'Vigente' : 'No vigente'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'token' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4>Token SIAT</h4>
              <button className="btn btn-primary btn-sm" onClick={() => openCreateModal('token')}>
                Nuevo Token
              </button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Valor</th>
                    <th>Versión</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.length === 0 ? (
                    <tr><td colSpan={7} className="text-center">Sin tokens registrados</td></tr>
                  ) : (
                    tokens.map(item => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td><code>{item.value}</code></td>
                        <td>{item.version}</td>
                        <td>{item.startDate?.split('T')[0] || '-'}</td>
                        <td>{item.endDate?.split('T')[0] || '-'}</td>
                        <td>
                          <span className={`badge ${item.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                            {item.state === 1 ? 'Habilitado' : 'Deshabilitado'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Eliminar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'puntos-venta' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4>Puntos de Venta</h4>
              <button className="btn btn-primary btn-sm" onClick={() => openCreateModal('puntos-venta')}>
                Nuevo Punto de Venta
              </button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Sucursal</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsSale.map(item => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.pointSaleCode}</td>
                      <td>{item.pointSaleName}</td>
                      <td>{item.pointSaleTypeName}</td>
                      <td>{item.branchOffice?.name || item.branchOfficeId}</td>
                      <td>{item.description || '-'}</td>
                      <td>
                        <span className={`badge ${item.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                          {item.state === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'certificados' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4>Certificados Digitales</h4>
              <button className="btn btn-secondary btn-sm" onClick={loadCertificados} disabled={loading}>
                Refrescar
              </button>
            </div>

            {certificados && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  Directorio: <code>{certificados.directorio}</code>
                </p>
<div className="table-wrap" style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Archivo</th>
                        <th>Estado</th>
                        <th>Tamaño</th>
                        <th>Ruta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificados.certificados.map(c => (
                        <tr key={c.nombre}>
                          <td><code>{c.nombre}</code></td>
                          <td>
                            <span className={`badge ${c.existe ? 'badge-success' : 'badge-neutral'}`}>
                              {c.existe ? 'Existe' : 'No existe'}
                            </span>
                          </td>
                          <td>{c.existe ? `${c.bytes} bytes` : '-'}</td>
                          <td><code style={{ fontSize: '11px' }}>{c.ruta}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: '8px' }}>
              <div className="card-header"><h4>Registrar certificados</h4></div>
              <form onSubmit={handleSubirCertificados}>
                <div className="grid grid-2" style={{ padding: '16px' }}>
                  <label className="field">
                    <span>Certificado (certificado.pem)</span>
                    <input
                      type="file"
                      accept=".pem,text/plain"
                      className="input"
                      onChange={e => setCertificadoFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <label className="field">
                    <span>Clave Privada (claveprivadakey.pem)</span>
                    <input
                      type="file"
                      accept=".pem,text/plain"
                      className="input"
                      onChange={e => setClavePrivadaFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <div style={{ padding: '0 16px 16px' }}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    Registrar archivos
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {tab === 'catalogos' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h4>Catálogos Sincronizados</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { loadAllCatalogCounts(); loadCatalog(catalogTab); }} disabled={loading}>
                  Refrescar
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleSincronizarTodo} disabled={loading}>
                  Sincronizar Todo
                </button>
              </div>
            </div>
            <div className="tabs" style={{ marginBottom: '12px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {CATALOGS.map(cat => (
                <button
                  key={cat.key}
                  className={`tab ${catalogTab === cat.key ? 'active' : ''}`}
                  onClick={() => setCatalogTab(cat.key)}
                >
                  {cat.label}
                  <span className="badge badge-neutral" style={{ marginLeft: '4px' }}>{catalogCounts[cat.key] ?? '-'}</span>
                </button>
              ))}
            </div>
            <div className="table-wrap" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: 'max-content' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '30px' }}>ID</th>
                    {CATALOGS.find(c => c.key === catalogTab)?.cols.map(col => (
                      <th key={col} style={{ minWidth: col === 'description' ? '200px' : '100px' }}>{col}</th>
                    ))}
                    <th style={{ minWidth: '80px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogData.length === 0 ? (
                    <tr><td colSpan={5} className="text-center">Sin datos sincronizados</td></tr>
                  ) : (
                    catalogData.map(item => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        {CATALOGS.find(c => c.key === catalogTab)?.cols.map(col => (
                          <td key={col}>
                            {col === 'productDescription' || col === 'legendDescription' ? (
                              <span>{item[col]}</span>
                            ) : (
                              <code>{String(item[col] ?? '')}</code>
                            )}
                          </td>
                        ))}
                        <td>
                          <span className={`badge ${item.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                            {item.state === 1 ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h4>{modalMode === 'create' ? 'Crear' : 'Editar'} {tab === 'cuis' ? 'CUIS' : tab === 'cufd' ? 'CUFD' : tab === 'puntos-venta' ? 'Punto de Venta' : tab === 'token' ? 'Token' : ''}</h4>
                <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {tab === 'cuis' && (
                    <div className="grid grid-2">
                      <label className="field">
                        <span>Sucursal</span>
                        <select className="input" value={formData.branchOfficeId} onChange={e => setFormData({...formData, branchOfficeId: e.target.value, pointSaleId: ''})} required>
                          <option value="">Seleccione...</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </label>
                      <label className="field">
                        <span>Punto de Venta</span>
                        <select className="input" value={formData.pointSaleId} onChange={e => setFormData({...formData, pointSaleId: e.target.value})} required disabled={!formData.branchOfficeId}>
                          <option value="">Seleccione...</option>
                          {pointsSale.filter(p => Number(p.branchOfficeId) === Number(formData.branchOfficeId)).map(p => (
                            <option key={p.id} value={p.id}>{p.pointSaleName} ({p.pointSaleCode})</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  {tab === 'cufd' && (
                    <div className="grid grid-2">
                      <label className="field">
                        <span>Sucursal</span>
                        <select
                          className="input"
                          value={formData.branchOfficeId}
                          onChange={e => setFormData({...formData, branchOfficeId: e.target.value, pointSaleId: '', cuisId: ''})}
                          required
                        >
                          <option value="">Seleccione...</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </label>
                      <label className="field">
                        <span>Punto de Venta</span>
                        <select
                          className="input"
                          value={formData.pointSaleId}
                          onChange={e => setFormData({...formData, pointSaleId: e.target.value, cuisId: ''})}
                          required
                          disabled={!formData.branchOfficeId}
                        >
                          <option value="">Seleccione...</option>
                          {pointsSale.filter(p => Number(p.branchOfficeId) === Number(formData.branchOfficeId)).map(p => (
                            <option key={p.id} value={p.id}>{p.pointSaleName} ({p.pointSaleCode})</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>CUIS</span>
                        <select
                          className="input"
                          value={formData.cuisId}
                          onChange={e => setFormData({...formData, cuisId: e.target.value})}
                          required
                          disabled={!formData.pointSaleId}
                        >
                          <option value="">Seleccione...</option>
                          {cuisList.filter(c => Number(c.pointSaleId) === Number(formData.pointSaleId)).map(c => (
                            <option key={c.id} value={c.id}>{c.code}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  {tab === 'puntos-venta' && (
                    <div className="grid grid-2">
                      <label className="field">
                        <span>Código Punto Venta</span>
                        <input type="number" className="input" value={formData.pointSaleCode} onChange={e => setFormData({...formData, pointSaleCode: e.target.value})} required />
                      </label>
                      <label className="field">
                        <span>Nombre</span>
                        <input className="input" value={formData.pointSaleName} onChange={e => setFormData({...formData, pointSaleName: e.target.value})} required />
                      </label>
                      <label className="field">
                        <span>Tipo</span>
                        <select className="input" value={formData.pointSaleTypeId} onChange={e => setFormData({...formData, pointSaleTypeId: e.target.value})} required>
                          {pointSaleTypes.map(t => <option key={t.id} value={t.id}>{t.description} ({t.classifierCode})</option>)}
                        </select>
                      </label>
                      <label className="field">
                        <span>Sucursal</span>
                        <select className="input" value={formData.branchOfficeId} onChange={e => setFormData({...formData, branchOfficeId: e.target.value})} required>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </label>
                      <label className="field">
                        <span>Descripción</span>
                        <input className="input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                      </label>
                    </div>
                  )}
                  {tab === 'token' && (
                    <div className="grid grid-2">
                      <label className="field">
                        <span>Valor del Token</span>
                        <input className="input" value={formData.tokenValue} onChange={e => setFormData({...formData, tokenValue: e.target.value})} placeholder="TokenApi ..." required />
                      </label>
                      <label className="field">
                        <span>Versión</span>
                        <input type="number" className="input" value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} required />
                      </label>
                      <label className="field">
                        <span>Fecha Fin</span>
                        <input type="date" className="input" value={formData.tokenEndDate} onChange={e => setFormData({...formData, tokenEndDate: e.target.value})} />
                      </label>
                    </div>
                  )}
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{modalMode === 'create' ? 'Crear' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SiatModule;
