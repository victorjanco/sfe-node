import { useState, useEffect, Fragment } from 'react';
import { Navigate, BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Login } from './Login';
import { SaleForm } from './SaleForm';
import { SalesList } from './SalesList';
import { UsersList } from './UsersList';
import { RolesList } from './RolesList';
import { PermissionsList } from './PermissionsList';
import { ProductsList } from './ProductsList';
import { Reports } from './Reports';
import { Sidebar } from './Sidebar';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
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
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
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