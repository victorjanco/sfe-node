import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { SaleForm } from './components/SaleForm';
import { SalesList } from './components/SalesList';
import { NoteSaleForm } from './components/NoteSaleForm';
import { NotesList } from './components/NotesList';
import { UsersList } from './components/UsersList';
import { RolesList } from './components/RolesList';
import { PermissionsList } from './components/PermissionsList';
import { ProductsList } from './components/ProductsList';
import { InventoryList } from './components/InventoryList';
import { Kardex } from './components/Kardex';
import { InventoryMovementForm } from './components/InventoryMovementForm';
import { InventoryEntriesList } from './components/InventoryEntriesList';
import { InventoryExitsList } from './components/InventoryExitsList';
import { WarehousesList } from './components/WarehousesList';
import { BalanceList } from './components/BalanceList';
import { CustomersList } from './components/CustomersList';
import { Reports } from './components/Reports';
import { ExportReports } from './components/ExportReports';
import { AdminConfig } from './components/AdminConfig';
import { Sidebar } from './components/Sidebar';
import { UserEdit } from './components/UserEdit';
import { SiatModule } from './components/SiatModule';

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isAuthenticated, navigate, location]);

  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
}

function CheckPermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.permissions.includes(permission)) {
      navigate('/', { replace: true });
    }
  }, [user, permission, navigate]);

  const hasPerm = user?.permissions.includes(permission);
  return hasPerm ? <>{children}</> : null;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes with layout (AppLayout) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="venta" replace />} />
          <Route path="venta" element={
            <CheckPermission permission="sales.create">
              <SaleForm />
            </CheckPermission>
          } />
          <Route path="ventas" element={
            <CheckPermission permission="sales.read">
              <SalesList />
            </CheckPermission>
          } />
          <Route path="nota-venta" element={
            <CheckPermission permission="sales.create">
              <NoteSaleForm />
            </CheckPermission>
          } />
          <Route path="notas-venta" element={
            <CheckPermission permission="sales.read">
              <NotesList />
            </CheckPermission>
          } />
          <Route path="inventario/productos" element={
            <CheckPermission permission="inventory.read">
              <ProductsList />
            </CheckPermission>
          } />
          <Route path="inventario/stock" element={
            <CheckPermission permission="reports.stock">
              <InventoryList />
            </CheckPermission>
          } />
          <Route path="inventario/kardex" element={
            <CheckPermission permission="reports.kardex">
              <Kardex />
            </CheckPermission>
          } />
          <Route path="inventario/ingresos" element={
            <CheckPermission permission="inventory_entries.read">
              <InventoryEntriesList />
            </CheckPermission>
          } />
          <Route path="inventario/salidas" element={
            <CheckPermission permission="inventory_exits.read">
              <InventoryExitsList />
            </CheckPermission>
          } />
          <Route path="inventario/almacenes" element={
            <CheckPermission permission="warehouse.read">
              <WarehousesList />
            </CheckPermission>
          } />
          <Route path="inventario/balance" element={
            <CheckPermission permission="reports.balance">
              <BalanceList />
            </CheckPermission>
          } />
          <Route path="clientes" element={
            <CheckPermission permission="users.read">
              <CustomersList />
            </CheckPermission>
          } />
          <Route path="reportes/ventas" element={
            <CheckPermission permission="reports.read">
              <Reports />
            </CheckPermission>
          } />
          <Route path="reportes/exportar" element={
            <CheckPermission permission="reports.export">
              <ExportReports />
            </CheckPermission>
          } />
          <Route path="admin/usuarios" element={
            <CheckPermission permission="users.read">
              <UsersList />
            </CheckPermission>
          } />
          <Route path="admin/usuarios/nuevo" element={
            <CheckPermission permission="users.create">
              <UserEdit />
            </CheckPermission>
          } />
          <Route path="admin/usuarios/:id/editar" element={
            <CheckPermission permission="users.update">
              <UserEdit />
            </CheckPermission>
          } />
          <Route path="admin/roles" element={
            <CheckPermission permission="roles.read">
              <RolesList />
            </CheckPermission>
          } />
          <Route path="admin/permisos" element={
            <CheckPermission permission="permissions.read">
              <PermissionsList />
            </CheckPermission>
          } />
          <Route path="admin/config" element={
            <CheckPermission permission="system.full_access">
              <AdminConfig />
            </CheckPermission>
          } />
          <Route path="siat" element={
            <CheckPermission permission="system.full_access">
              <SiatModule />
            </CheckPermission>
          } />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppLayout() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'venta' | 'ventas'>('venta');

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="app">
          <header className="app-header">
            <h1>SFE Facturación — Compra Venta</h1>
            <div className="header-right">
              <span className="user-info">{user?.username} ({user?.roles.join(', ')})</span>
              <button className="btn btn-secondary" onClick={logout}>Salir</button>
            </div>
          </header>
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </main>
    </div>
  );
}

function App() {
  const { initialized } = useAuth();

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="card p-4 text-center">Cargando...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoot() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppRoot;