import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  label: string;
  path: string;
  permission?: string;
  children?: NavItem[];
}

const navConfig: NavItem[] = [
  {
    label: 'Ventas',
    path: '/',
    permission: 'sales.read',
    children: [
      { label: 'Nueva Venta', path: '/venta', permission: 'sales.create' },
      { label: 'Listar Ventas', path: '/ventas', permission: 'sales.read' },
      { label: 'Nota de Venta', path: '/nota-venta', permission: 'sales.create' },
      { label: 'Listar Notas de Venta', path: '/notas-venta', permission: 'sales.read' },
    ],
  },
  {
    label: 'Inventario',
    path: '/inventario',
    permission: 'inventory.read',
    children: [
      { label: 'Productos', path: '/inventario/productos', permission: 'inventory.read' },
      { label: 'Stock', path: '/inventario/stock', permission: 'reports.stock' },
      { label: 'Kardex', path: '/inventario/kardex', permission: 'reports.kardex' },
      { label: 'Ingresos', path: '/inventario/ingresos', permission: 'inventory_entries.read' },
      { label: 'Salidas', path: '/inventario/salidas', permission: 'inventory_exits.read' },
      { label: 'Almacenes', path: '/inventario/almacenes', permission: 'warehouse.read' },
      { label: 'Balance', path: '/inventario/balance', permission: 'reports.balance' },
    ],
  },
  {
    label: 'Clientes',
    path: '/clientes',
    permission: 'users.read',
  },
  {
    label: 'Reportes',
    path: '/reportes',
    permission: 'reports.read',
    children: [
      { label: 'Ventas', path: '/reportes/ventas', permission: 'reports.read' },
      { label: 'Exportar', path: '/reportes/exportar', permission: 'reports.export' },
    ],
  },
  {
    label: 'SIAT',
    path: '/siat',
    permission: 'system.full_access',
  },
  {
    label: 'Administración',
    path: '/admin',
    permission: 'system.full_access',
    children: [
      { label: 'Usuarios', path: '/admin/usuarios', permission: 'users.read' },
      { label: 'Roles', path: '/admin/roles', permission: 'roles.read' },
      { label: 'Permisos', path: '/admin/permisos', permission: 'permissions.read' },
      { label: 'Configuración', path: '/admin/config', permission: 'system.full_access' },
    ],
  },
];

function filterNavItems(items: NavItem[], permissions: string[]): NavItem[] {
  return items
    .filter((item) => !item.permission || permissions.includes(item.permission))
    .map((item) => ({
      ...item,
      children: item.children ? filterNavItems(item.children, permissions) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

export function Sidebar() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return null;

  const filteredItems = filterNavItems(navConfig, user.permissions);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>SFE Facturación</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {filteredItems.map((item) => (
            <li key={item.path} className="nav-item">
              {item.children && item.children.length > 0 ? (
                <NavGroup item={item} />
              ) : (
                <a href={item.path} className="nav-link">
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <span className="user-role">{user.roles.join(', ')}</span>
      </div>
    </aside>
  );
}

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={`nav-group-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        <span>{item.label}</span>
        <span className="chevron">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <ul className="nav-submenu">
          {item.children?.map((child) => (
            <li key={child.path}>
              <a href={child.path} className="nav-link sub">
                {child.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}