import { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '../api/client';

interface Role {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  rolePermissions: Array<{ permission: { name: string; description?: string } }>;
  userRoles: Array<{ user: { username: string } }>;
}

interface RoleListProps {
  onCreate?: () => void;
  onEdit?: (role: Role) => void;
}

export function RolesList({ onCreate, onEdit }: RoleListProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await apiGet<Role[]>('/roles');
      setRoles(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoles(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este rol?')) return;
    try {
      await apiDelete(`/roles/${id}`);
      loadRoles();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Roles</h3>
        {onCreate && <button className="btn btn-primary btn-sm" onClick={onCreate}>Nuevo Rol</button>}
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
                  <th>Descripción</th>
                  <th>Permisos</th>
                  <th>Usuarios</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td>{role.id}</td>
                    <td><strong>{role.name}</strong></td>
                    <td>{role.description || '-'}</td>
                    <td>{role.rolePermissions?.length || 0}</td>
                    <td>{role.userRoles?.map(ur => ur.user.username).join(', ') || '-'}</td>
                    <td>
                      <span className={`badge ${role.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {role.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {onEdit && <button className="btn btn-secondary btn-sm" onClick={() => onEdit(role)}>Editar</button>}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(role.id)}>Eliminar</button>
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