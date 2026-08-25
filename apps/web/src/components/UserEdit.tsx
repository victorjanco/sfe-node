import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import { User, Role, Permission } from '../types';

export function UserEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    isActive: true,
    roleIds: [] as number[],
    permissionIds: [] as number[],
  });

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, rolesData, permsData] = await Promise.all([
        apiGet<User>(`/users/${userId}`),
        apiGet<Role[]>('/roles'),
        apiGet<Permission[]>('/permissions'),
      ]);
      setUser(userData);
      setRoles(rolesData);
      setPermissions(permsData);
      setFormData({
        username: userData.username,
        email: userData.email,
        isActive: userData.isActive,
        roleIds: userData.userRoles?.map(ur => ur.role.id) || [],
        permissionIds: userData.userPermissions?.map(up => up.permission.id) || [],
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (roleId: number) => {
    setFormData(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const handlePermissionChange = (permId: number) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter(id => id !== permId)
        : [...prev.permissionIds, permId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPut(`/users/${userId}`, formData);
      navigate('/admin/usuarios');
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card p-4 text-center">Cargando...</div>;

  return (
    <div className="card">
      <div className="card-header">
        <h3>{user ? `Editar: ${user.username}` : 'Nuevo Usuario'}</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/usuarios')}>
          Volver
        </button>
      </div>
      <div className="card-body">
        {error && <div className="error-text">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <label className="field">
              <span>Usuario</span>
              <input className="input" value={formData.username} onChange={e => handleChange('username', e.target.value)} required disabled />
            </label>
            <label className="field">
              <span>Email</span>
              <input className="input" type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} required />
            </label>
          </div>
          <div className="field">
            <span>Estado</span>
            <label className="checkbox">
              <input type="checkbox" checked={formData.isActive} onChange={e => handleChange('isActive', e.target.checked)} />
              Activo
            </label>
          </div>

          <h4 className="section-title">Roles</h4>
          <div className="checkbox-row">
            {roles.map(role => (
              <label key={role.id} className={`checkbox ${formData.roleIds.includes(role.id) ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.roleIds.includes(role.id)}
                  onChange={() => handleRoleChange(role.id)}
                />
                {role.name} - {role.description}
              </label>
            ))}
          </div>

          <h4 className="section-title">Permisos Directos</h4>
          <div className="checkbox-row" style={{ maxHeight: '200px', overflow: 'auto' }}>
            {permissions.map(perm => (
              <label key={perm.id} className={`checkbox ${formData.permissionIds.includes(perm.id) ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.permissionIds.includes(perm.id)}
                  onChange={() => handlePermissionChange(perm.id)}
                />
                <code>{perm.name}</code> - {perm.description}
              </label>
            ))}
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/usuarios')}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}