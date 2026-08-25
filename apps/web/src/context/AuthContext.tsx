import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiGet } from '../api/client';
import { User, BranchOffice, PointSale } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  branchOfficeId: number | null;
  pointSaleId: number | null;
  branchOffices: BranchOffice[];
  pointSales: PointSale[];
  login: (token: string, user: User, branchOfficeId: number, pointSaleId?: number) => void;
  logout: () => void;
  setBranchOffice: (id: number) => void;
  setPointSale: (id: number) => void;
  isAuthenticated: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [branchOfficeId, setBranchOfficeIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('branchOfficeId');
    return stored ? parseInt(stored, 10) : null;
  });
  const [pointSaleId, setPointSaleIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('pointSaleId');
    return stored ? parseInt(stored, 10) : null;
  });
  const [branchOffices, setBranchOffices] = useState<BranchOffice[]>([]);
  const [pointSales, setPointSales] = useState<PointSale[]>([]);
  const [initialized, setInitialized] = useState(false);

  const setBranchOffice = (id: number) => {
    setBranchOfficeIdState(id);
    localStorage.setItem('branchOfficeId', id.toString());
  };

  const setPointSale = (id: number) => {
    setPointSaleIdState(id);
    localStorage.setItem('pointSaleId', id.toString());
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('branchOfficeId');
    localStorage.removeItem('pointSaleId');
    setToken(null);
    setUser(null);
    setBranchOfficeIdState(null);
    setPointSaleIdState(null);
  };

  const loadBranchOffices = async () => {
    try {
      const data = await apiGet<BranchOffice[]>('/branch_office/get_list_enabled');
      setBranchOffices(data);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const loadPointSales = async () => {
    if (!branchOfficeId) return;
    try {
      const data = await apiGet<PointSale[]>(`/siat/punto_venta/sucursal/${branchOfficeId}`);
      setPointSales(data);
    } catch (err) {
      console.error('Error loading point sales:', err);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      apiGet<User>('/auth/me')
        .then((user) => {
          setUser(user);
          // Load branch offices after user is loaded
          loadBranchOffices();
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('branchOfficeId');
          localStorage.removeItem('pointSaleId');
          setToken(null);
          setUser(null);
        })
        .finally(() => setInitialized(true));
    } else {
      setInitialized(true);
    }
  }, []);

  // Load point sales when branch office changes
  useEffect(() => {
    if (branchOfficeId) {
      loadPointSales();
      localStorage.setItem('branchOfficeId', branchOfficeId.toString());
    } else {
      localStorage.removeItem('branchOfficeId');
      localStorage.removeItem('pointSaleId');
      setPointSaleIdState(null);
    }
  }, [branchOfficeId]);

  const login = (newToken: string, newUser: any, branchOfficeId: number, pointSaleId?: number) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('branchOfficeId', branchOfficeId.toString());
    if (pointSaleId) {
      localStorage.setItem('pointSaleId', pointSaleId.toString());
    }
    setToken(newToken);
    setUser(newUser);
    setBranchOfficeIdState(branchOfficeId);
    if (pointSaleId) {
      setPointSaleIdState(pointSaleId);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      branchOfficeId, 
      pointSaleId,
      branchOffices,
      pointSales,
      login, 
      logout, 
      setBranchOffice, 
      setPointSale, 
      isAuthenticated: !!user, 
      initialized 
    }}>
      {initialized && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}