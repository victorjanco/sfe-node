import { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '../api/client';

interface Permission {
  id: number;
  name: string;
  description?: string;
  module?: string;
  action?: string;
  isActive: boolean;
  rolePermissions: Array<{ role: { name: string } }>;
  userPermissions: Array<{ user: { username: string } }>;
}

interface PermissionsListProps {
  onCreate?: () => void;
  onEdit?: (permission: Permission) => void;
}

export function PermissionsList({ onCreate, onEdit }: PermissionsListProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await apiGet<Permission[]>('/permissions');
      setPermissions(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPermissions(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este permiso?')) return;
    try {
      await apiDelete(`/permissions/${id}`);
      loadPermissions();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Permisos</h3>
        {onCreate && <button className="btn btn-primary btn-sm" onClick={onCreate}>Nuevo Permiso</button>}
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
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Descripción</th>
                  <th>Roles</th>
                  <th>Usuarios</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.id}>
                    <td>{perm.id}</td>
                    <td><code>{perm.name}</code></td>
                    <td>{perm.module || '-'}</td>
                    <td>{perm.action || '-'}</td>
                    <td>{perm.description || '-'}</td>
                    <td>{perm.rolePermissions?.map(rp => rp.role.name).join(', ') || '-'}</td>
                    <td>{perm.userPermissions?.map(up => up.user.username).join(', ') || '-'}</td>
                    <td>
                      <span className={`badge ${perm.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {perm.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => onEdit?.(perm)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { if(confirm('Eliminar?')) apiDelete(`/permissions/${perm.id}`).then(()=>{}) }}>Eliminar</button>
                      </div>
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