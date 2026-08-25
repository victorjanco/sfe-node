import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api/client';
import { formatDate } from '../utils/format';

type TabKey = 'overview' | 'company' | 'branches' | 'tokens' | 'siat' | 'users' | 'env';

interface SystemConfigState {
  company: any;
  companies: any[];
  branchOffices: any[];
  pointSales: any[];
  tokens: any[];
  stats: {
    customers: number;
    products: number;
    warehouses: number;
    salesCount: number;
    invoicesCount: number;
    inventoryQty: number;
  };
  lastSale: any;
  lastInvoice: any;
  users: Array<{
    id: number; username: string; email: string; isActive: boolean; createdAt?: string | null;
    roles: string[]; permissions: string[];
  }>;
  roles: any[];
  permissions: any[];
  siat: {
    enabled: boolean; baseUrl: string; codigoAmbiente: number; codigoModalidad: number;
    codigoSistema: string; nit: string; codigoSucursal: number; codigoPuntoVenta: number;
    hasPrivateKey: boolean; hasPublicKey: boolean; hasToken: boolean;
  };
  env: Record<string, any>;
}

export function AdminConfig() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [cfg, setCfg] = useState<SystemConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<SystemConfigState>('/system/config');
      setCfg(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const save = async (endpoint: string, body: any, label: string) => {
    setSaving(label);
    try {
      await apiPost(`/system/config/${endpoint}`, body);
      showToast(`${label} guardado correctamente`);
      void load();
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    } finally {
      setSaving(null);
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Resumen' },
    { key: 'company', label: 'Empresa' },
    { key: 'branches', label: 'Sucursales / PDV' },
    { key: 'tokens', label: 'Tokens SIAT' },
    { key: 'siat', label: 'Estado SIAT' },
    { key: 'users', label: 'Usuarios / Roles' },
    { key: 'env', label: 'Entorno' },
  ];

  if (loading) return <div className="card p-4 text-center">Cargando configuración del sistema…</div>;
  if (error || !cfg) {
    return (
      <div className="card p-4">
        <p className="error-text">{error}</p>
        <button className="btn" onClick={() => void load()}>Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className="card success-toast" style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
          {toast}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Configuración del Sistema</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => void load()}>Recargar</button>
        </div>
        <div className="card-body">
          <div className="tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ paddingTop: '16px' }}>
            {tab === 'overview' && <Overview cfg={cfg} />}
            {tab === 'company' && <CompanyTab cfg={cfg} save={(body) => save('company', body, 'Empresa')} saving={!!saving} />}
            {tab === 'branches' && <BranchesTab cfg={cfg} save={(endpoint, body, label) => save(endpoint, body, label)} saving={!!saving} />}
            {tab === 'tokens' && <TokensTab cfg={cfg} save={(body) => save('token', body, 'Token')} saving={!!saving} />}
            {tab === 'siat' && <SiatTab cfg={cfg} />}
            {tab === 'users' && <UsersRolesTab cfg={cfg} />}
            {tab === 'env' && <EnvTab cfg={cfg} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: 'success' | 'warning' | 'neutral' }) {
  return (
    <div className="card" style={{ padding: '12px', margin: 0 }}>
      <div className="small text-muted">{label}</div>
      <div className={`big-number ${tone === 'success' ? 'success' : ''}`}>{value}</div>
    </div>
  );
}

function Overview({ cfg }: { cfg: SystemConfigState }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <Stat label="Empresas registradas" value={cfg.companies.length} />
        <Stat label="Sucursales" value={cfg.branchOffices.length} />
        <Stat label="Puntos de Venta" value={cfg.pointSales.length} />
        <Stat label="Usuarios" value={cfg.users.length} />
        <Stat label="Roles" value={cfg.roles.length} />
        <Stat label="Permisos" value={cfg.permissions.length} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <Stat label="Clientes" value={cfg.stats.customers} />
        <Stat label="Productos activos" value={cfg.stats.products} />
        <Stat label="Ventas registradas" value={cfg.stats.salesCount} tone="success" />
        <Stat label="Facturas emitidas" value={cfg.stats.invoicesCount} tone="success" />
      </div>

      <div className="card" style={{ padding: 0, marginBottom: '16px' }}>
        <div className="card-header"><h4>Última factura emitida</h4></div>
        <div className="card-body">
          {cfg.lastInvoice ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              <div><span className="small text-muted">N° Factura:</span> <strong>{cfg.lastInvoice.invoiceNumFormat}</strong></div>
              <div><span className="small text-muted">Fecha:</span> {formatDate(cfg.lastInvoice.invoiceDate)}</div>
              <div><span className="small text-muted">Cliente:</span> {cfg.lastInvoice.customer?.invoiceName ?? cfg.lastInvoice.customerName}</div>
              <div><span className="small text-muted">Total:</span> <strong>Bs {Number(cfg.lastInvoice.total).toFixed(2)}</strong></div>
              <div><span className="small text-muted">Sucursal:</span> {cfg.lastInvoice.branchOffice?.name ?? '-'}</div>
              <div><span className="small text-muted">PDV:</span> {cfg.lastInvoice.pointSale?.pointSaleName ?? '-'}</div>
              <div><span className="small text-muted">CUF:</span> <span className="mono small">{cfg.lastInvoice.cuf ?? '-'}</span></div>
              <div>
                <span className="small text-muted">Estado SIAT:</span>{' '}
                <span className={`badge ${cfg.lastInvoice.state === 'V' ? 'badge-success' : 'badge-neutral'}`}>
                  {cfg.lastInvoice.state}
                </span>
              </div>
            </div>
          ) : <p className="notice">Aún no hay facturas emitidas.</p>}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-header"><h4>Última venta registrada</h4></div>
        <div className="card-body">
          {cfg.lastSale ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              <div><span className="small text-muted">N° Venta:</span> <strong>{cfg.lastSale.saleNum}</strong></div>
              <div><span className="small text-muted">Tipo:</span> {cfg.lastSale.saleType}</div>
              <div><span className="small text-muted">Cliente:</span> {cfg.lastSale.customer?.invoiceName ?? '-'}</div>
              <div><span className="small text-muted">Total:</span> <strong>Bs {Number(cfg.lastSale.total).toFixed(2)}</strong></div>
            </div>
          ) : <p className="notice">Aún no hay ventas.</p>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
      {hint && <div className="small text-muted">{hint}</div>}
    </div>
  );
}

function CompanyTab({ cfg, save, saving }: { cfg: SystemConfigState; save: (body: any) => void; saving: boolean }) {
  const c = cfg.company ?? {};
  const [form, setForm] = useState<any>({ ...c });

  useEffect(() => { setForm({ ...cfg.company }); }, [cfg.company?.id]);

  const updated = (key: string, value: any) => setForm({ ...form, [key]: value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save({ id: form.id, ...form }); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Field label="ID">
          <input className="input" value={form.id ?? ''} disabled />
        </Field>
        <Field label="NIT">
          <input className="input" value={form.nit ?? ''} onChange={(e) => updated('nit', e.target.value)} />
        </Field>
        <Field label="Razón social" hint="Nombre legal de la empresa">
          <input className="input" value={form.nameCompany ?? ''} onChange={(e) => updated('nameCompany', e.target.value)} />
        </Field>
        <Field label="Nombre comercial">
          <input className="input" value={form.name ?? ''} onChange={(e) => updated('name', e.target.value)} />
        </Field>
        <Field label="Código de sistema">
          <input className="input" value={form.systemCode ?? ''} onChange={(e) => updated('systemCode', e.target.value)} />
        </Field>
        <Field label="Código de modalidad">
          <input type="number" className="input" value={form.modalityCode ?? ''} onChange={(e) => updated('modalityCode', Number(e.target.value))} />
        </Field>
        <Field label="Código de ambiente" hint="1 = Producción, 2 = Pruebas">
          <input type="number" className="input" value={form.environmentCode ?? ''} onChange={(e) => updated('environmentCode', Number(e.target.value))} />
        </Field>
        <Field label="Tipo de impresión" hint="1 = Carta, 2 = Ticket/rollo">
          <input type="number" className="input" value={form.typePrint ?? 1} onChange={(e) => updated('typePrint', Number(e.target.value))} />
        </Field>
        <Field label="Descripción">
          <input className="input" value={form.description ?? ''} onChange={(e) => updated('description', e.target.value)} />
        </Field>
        <Field label="Correo SIAT">
          <input className="input" value={form.emailSiat ?? ''} onChange={(e) => updated('emailSiat', e.target.value)} />
        </Field>
      </div>
      <div style={{ marginTop: '16px' }}>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar Empresa'}
        </button>
      </div>
    </form>
  );
}

function BranchesTab({ cfg, save, saving }: { cfg: SystemConfigState; save: (endpoint: string, body: any, label: string) => void; saving: boolean }) {
  return (
    <div>
      <h4 style={{ marginTop: 0 }}>Sucursales</h4>
      <div className="table-wrap" style={{ marginBottom: '24px' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Nombre comercial</th>
              <th>NIT</th>
              <th>Ciudad</th>
              <th>PDVs</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cfg.branchOffices.map((b) => (
              <tr key={b.id}>
                <td>{b.code}</td>
                <td>{b.name}</td>
                <td>{b.tradename}</td>
                <td>{b.nit}</td>
                <td>{b.city}</td>
                <td>{b.pointSales?.length ?? 0}</td>
                <td>
                  <span className={`badge ${b.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                    {b.state === 1 ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm"
                    onClick={() => save('branch_office', { ...b }, `Sucursal ${b.name}`)}
                    disabled={saving}
                  >
                    Guardar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Puntos de Venta</h4>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Código PDV</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cfg.pointSales.map((p) => (
              <tr key={p.id}>
                <td>{p.pointSaleCode}</td>
                <td>{p.pointSaleName}</td>
                <td>{p.pointSaleTypeName}</td>
                <td>
                  <span className={`badge ${p.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                    {p.state === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TokensTab({ cfg, save, saving }: { cfg: SystemConfigState; save: (body: any) => void; saving: boolean }) {
  const [form, setForm] = useState<any>({
    value: '', version: 2, state: 1, startDate: '', endDate: '',
  });

  const onChange = (key: string, value: any) => setForm({ ...form, [key]: value });

  return (
    <div>
      <div className="card" style={{ padding: 0, marginBottom: '16px' }}>
        <div className="card-header"><h4>Nuevo Token SIAT</h4></div>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save({ ...form });
              setForm({ value: '', version: 2, state: 1, startDate: '', endDate: '' });
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Field label="Valor del token">
                <input className="input" value={form.value} onChange={(e) => onChange('value', e.target.value)} required />
              </Field>
              <Field label="Versión">
                <input type="number" className="input" value={form.version} onChange={(e) => onChange('version', Number(e.target.value))} />
              </Field>
              <Field label="Estado (1=activo, 0=inactivo)">
                <input type="number" className="input" value={form.state} onChange={(e) => onChange('state', Number(e.target.value))} />
              </Field>
              <Field label="Vigencia desde">
                <input type="date" className="input" value={form.startDate} onChange={(e) => onChange('startDate', e.target.value)} />
              </Field>
              <Field label="Vigencia hasta">
                <input type="date" className="input" value={form.endDate} onChange={(e) => onChange('endDate', e.target.value)} />
              </Field>
              <Field label="">
                <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }} disabled={saving}>
                  {saving ? 'Guardando…' : 'Crear Token'}
                </button>
              </Field>
            </div>
          </form>
        </div>
      </div>

      <h4>Tokens existentes</h4>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Valor (primeros caracteres)</th>
              <th>Versión</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cfg.tokens.length === 0 && (
              <tr><td colSpan={6} className="text-center text-muted p-4">No hay tokens registrados</td></tr>
            )}
            {cfg.tokens.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td><span className="mono">{(t.value ?? '').slice(0, 16)}…</span></td>
                <td>{t.version}</td>
                <td>{t.startDate ? formatDate(t.startDate) : '-'}</td>
                <td>{t.endDate ? formatDate(t.endDate) : '-'}</td>
                <td>
                  <span className={`badge ${t.state === 1 ? 'badge-success' : 'badge-neutral'}`}>
                    {t.state === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SiatTab({ cfg }: { cfg: SystemConfigState }) {
  const siat = cfg.siat;
  const row = (label: string, value: any, ok?: boolean) => (
    <tr>
      <td style={{ width: '250px' }}>{label}</td>
      <td>
        <code>{typeof value === 'boolean' ? (value ? 'Sí' : 'No') : (value ?? '-')}</code>
        {typeof ok === 'boolean' && (
          ok ? <span className="badge badge-success" style={{ marginLeft: '8px' }}>OK</span>
             : <span className="badge badge-neutral" style={{ marginLeft: '8px' }}>Faltante</span>
        )}
      </td>
    </tr>
  );
  const ambienteLabel = (c: number) => c === 1 ? 'Producción' : c === 2 ? 'Pruebas (Piloto)' : `Desconocido (${c})`;
  const modalidadLabel = (c: number) => c === 1 ? 'Computarizada en línea' : c === 2 ? 'Computarizada fuera de línea' : `(${c})`;

  return (
    <div>
      <div className="card" style={{ padding: 0, marginBottom: '16px' }}>
        <div className="card-header">
          <h4>Integración SIAT</h4>
          <span className={`badge ${siat.enabled ? 'badge-success' : 'badge-neutral'}`}>
            {siat.enabled ? 'MODO REAL (SOAP SIAT)' : 'MODO DEMO (stub local)'}
          </span>
        </div>
        <div className="card-body">
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {row('SIAT habilitado', siat.enabled)}
                {row('URL base', siat.baseUrl)}
                {row('Ambiente', ambienteLabel(siat.codigoAmbiente))}
                {row('Modalidad', modalidadLabel(siat.codigoModalidad))}
                {row('Código de sistema', siat.codigoSistema || '-', Boolean(siat.codigoSistema))}
                {row('NIT emisor', siat.nit || '-', Boolean(siat.nit))}
                {row('Código sucursal', siat.codigoSucursal || 0, Boolean(siat.codigoSucursal))}
                {row('Código punto de venta', siat.codigoPuntoVenta || 0, Boolean(siat.codigoPuntoVenta))}
                {row('Token SIAT cargado', siat.hasToken ? 'Sí' : 'No', siat.hasToken)}
                {row('Certificado público (.pem)', siat.hasPublicKey ? 'Sí' : 'No', siat.hasPublicKey)}
                {row('Clave privada (.pem)', siat.hasPrivateKey ? 'Sí' : 'No', siat.hasPrivateKey)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-header"><h4>Verificación de prerequisitos</h4></div>
        <div className="card-body">
          <ul>
            <li>
              {siat.enabled && siat.hasToken && siat.codigoSistema && siat.nit
                ? <span className="success">Puede emitir facturas reales al SIAT.</span>
                : <span className="warning">Faltan datos para facturación real (revisa empresa, token y certificados en <code>apps/api/keys/</code>).</span>}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function UsersRolesTab({ cfg }: { cfg: SystemConfigState }) {
  return (
    <div>
      <h4 style={{ marginTop: 0 }}>Usuarios</h4>
      <div className="table-wrap" style={{ marginBottom: '20px' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Permisos totales</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cfg.users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.username}</strong></td>
                <td>{u.email}</td>
                <td>
                  {u.roles.length === 0
                    ? <span className="text-muted small">—</span>
                    : u.roles.map((r) => <span key={r} className="badge" style={{ marginRight: '4px' }}>{r}</span>)}
                </td>
                <td>{u.permissions.length}</td>
                <td>
                  <span className={`badge ${u.isActive ? 'badge-success' : 'badge-neutral'}`}>
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Roles</h4>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Rol</th>
              <th>Descripción</th>
              <th>Permisos</th>
            </tr>
          </thead>
          <tbody>
            {cfg.roles.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td>{r.description ?? '-'}</td>
                <td className="small">
                  {r.permissions?.length === 0
                    ? <span className="text-muted">Sin permisos</span>
                    : r.permissions?.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnvTab({ cfg }: { cfg: SystemConfigState }) {
  const entries = Object.entries(cfg.env);
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="card-header">
        <h4>Variables de entorno detectadas</h4>
        <span className="small text-muted">Solo se muestran flags, nunca valores secretos.</span>
      </div>
      <div className="card-body">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '250px' }}>Variable</th>
                <th>Valor / Estado</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k}>
                  <td><code>{k}</code></td>
                  <td>
                    {typeof v === 'boolean' ? (
                      <span className={`badge ${v ? 'badge-success' : 'badge-neutral'}`}>
                        {v ? 'Configurado' : 'Por defecto / NO configurado'}
                      </span>
                    ) : (
                      <code>{v ?? '(no definida)'}</code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
