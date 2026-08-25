import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import {
  Activity,
  BranchOffice,
  IdentityDocumentType,
  PaymentMethodType,
  PointSale,
  SectorDocument,
  TypeInvoiceDocument,
  TypeMoneySaleResponse,
} from '../types';

export interface SaleCatalogs {
  loading: boolean;
  error: string | null;
  activities: Activity[];
  sectorDocuments: SectorDocument[];
  identityDocumentTypes: IdentityDocumentType[];
  typeInvoiceDocuments: TypeInvoiceDocument[];
  paymentMethodTypes: PaymentMethodType[];
  branchOffices: BranchOffice[];
  pointSales: PointSale[];
  moneySale: string;
  typePrint: number;
  decimals: { product: number; price: number; amount: number; discount: number; total: number };
  reload: () => Promise<void>;
}

export function useSaleCatalogs(): SaleCatalogs {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sectorDocuments, setSectorDocuments] = useState<SectorDocument[]>([]);
  const [identityDocumentTypes, setIdentityDocumentTypes] = useState<IdentityDocumentType[]>([]);
  const [typeInvoiceDocuments, setTypeInvoiceDocuments] = useState<TypeInvoiceDocument[]>([]);
  const [paymentMethodTypes, setPaymentMethodTypes] = useState<PaymentMethodType[]>([]);
  const [branchOffices, setBranchOffices] = useState<BranchOffice[]>([]);
  const [pointSales, setPointSales] = useState<PointSale[]>([]);
  const [config, setConfig] = useState({
    moneySale: 'Bs',
    typePrint: 1,
    decimals: { product: 4, price: 2, amount: 2, discount: 2, total: 2 },
  });

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [typeMoney, act, sectors, idents, types, payments] = await Promise.all([
        apiGet<TypeMoneySaleResponse>('/sale/get_type_money_sale'),
        apiGet<Activity[]>('/catalog/activity/get_list_enabled'),
        apiGet<SectorDocument[]>('/catalog/sector_document/get_list_enabled'),
        apiGet<IdentityDocumentType[]>('/catalog/identity_document_type/get_list_enabled'),
        apiGet<TypeInvoiceDocument[]>('/catalog/type_invoice_document/get_list_enabled'),
        apiGet<PaymentMethodType[]>('/catalog/payment_method_type/get_list_enabled'),
      ]);
      setActivities(act);
      setSectorDocuments(sectors);
      setIdentityDocumentTypes(idents);
      setTypeInvoiceDocuments(types);
      setPaymentMethodTypes(payments);
      setBranchOffices(typeMoney.branch_offices ?? []);
      setPointSales(typeMoney.point_sales ?? []);
      setConfig({
        moneySale: typeMoney.TYPE_MONEY_SALE ?? 'Bs',
        typePrint: typeMoney.TYPE_PRINT ?? 1,
        decimals: {
          product: typeMoney.DECIMAL_PRODUCT ?? 4,
          price: typeMoney.DECIMAL_PRICE ?? 2,
          amount: typeMoney.DECIMAL_AMOUNT ?? 2,
          discount: typeMoney.DECIMAL_DISCOUNT ?? 2,
          total: typeMoney.DECIMAL_TOTALS ?? 2,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar catálogos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    error,
    activities,
    sectorDocuments,
    identityDocumentTypes,
    typeInvoiceDocuments,
    paymentMethodTypes,
    branchOffices,
    pointSales,
    moneySale: config.moneySale,
    typePrint: config.typePrint,
    decimals: config.decimals,
    reload,
  };
}