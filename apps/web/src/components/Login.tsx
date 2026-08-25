import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiGet } from '../api/client';
import { BranchOffice, PointSale } from '../types';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branchOfficeId, setBranchOfficeId] = useState<number | ''>('');
  const [pointSaleId, setPointSaleId] = useState<number | ''>('');
  const [branches, setBranches] = useState<BranchOffice[]>([]);
  const [pointSales, setPointSales] = useState<PointSale[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'pointSale'>('login');

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await apiGet<BranchOffice[]>('/branch_office/get_list_enabled');
        setBranches(data);
        if (data.length > 0 && !branchOfficeId) {
          setBranchOfficeId(data[0].id);
        }
      } catch (err) {
        console.error('Error loading branches:', err);
      }
    };
    loadBranches();
  }, []);

useEffect(() => {
    if (branchOfficeId && step === 'pointSale') {
      const loadPointSales = async () => {
        try {
          const data = await apiGet<PointSale[]>(`/siat/punto_venta/sucursal/${branchOfficeId}`);
          setPointSales(data);
          if (data.length > 0 && !pointSaleId) {
            setPointSaleId(data[0].id);
          }
        } catch (err) {
          console.error('Error loading point sales:', err);
        }
      };
      loadPointSales();
    }
  }, [branchOfficeId, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiPost<{ accessToken: string; user: any }>('/auth/login', { 
        username, 
        password, 
        branchOfficeId: branchOfficeId ? Number(branchOfficeId) : undefined 
      });
      
      if (step === 'login') {
        // Step 1: Login successful, save token and show point of sale selection
        localStorage.setItem('token', res.accessToken);
        setStep('pointSale');
        setLoading(false);
      } else {
        // Step 2: Point of sale selected, complete login
        login(res.accessToken, res.user, res.user.branchOfficeId || branchOfficeId, Number(pointSaleId));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === '' ? '' : Number(e.target.value);
    setBranchOfficeId(value);
    setPointSaleId(''); // Reset point sale when branch changes
  };

  if (step === 'pointSale') {
    return (
      <div className="login-page">
        <div className="login-card">
          <h2>SFE Facturación</h2>
          <p style={{marginBottom: '16px', color: '#666'}}>Seleccione el punto de venta</p>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label htmlFor="branchOffice">Sucursal</label>
              <select
                id="branchOffice"
                value={branchOfficeId}
                onChange={handleBranchChange}
                disabled
                required
              >
                <option value="">Seleccionar sucursal</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="pointSale">Punto de Venta</label>
              <select
                id="pointSale"
                value={pointSaleId}
                onChange={(e) => setPointSaleId(e.target.value === '' ? '' : Number(e.target.value))}
                required
              >
                <option value="">Seleccionar punto de venta</option>
                {pointSales.map(ps => (
                  <option key={ps.id} value={ps.id}>
                    {ps.pointSaleName} ({ps.pointSaleCode})
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Iniciando...' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>SFE Facturación</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="branchOffice">Sucursal</label>
            <select
              id="branchOffice"
              value={branchOfficeId}
              onChange={(e) => setBranchOfficeId(e.target.value === '' ? '' : Number(e.target.value))}
              required
            >
              <option value="">Seleccionar sucursal</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Iniciando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}