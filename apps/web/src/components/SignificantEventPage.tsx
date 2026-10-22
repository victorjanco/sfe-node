import { useState, useEffect } from 'react';
import { apiGet } from '../api/client';
import { SignificantEventList } from './SignificantEventList';

export function SignificantEventPage() {
  const [branches, setBranches] = useState<{ id: number; name: string; code: number }[]>([]);
  const [pointsSale, setPointsSale] = useState<{ id: number; pointSaleCode: number; pointSaleName: string; branchOfficeId: number }[]>([]);

  useEffect(() => {
    apiGet<any[]>('/branch_office/get_list_enabled')
      .then(setBranches)
      .catch(() => {});

    apiGet<any[]>('/catalog/point_sale/get_list_enabled')
      .then(setPointsSale)
      .catch(() => {});
  }, []);

  return <SignificantEventList branches={branches} pointsSale={pointsSale} />;
}
