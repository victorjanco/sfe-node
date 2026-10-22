import { useState, useEffect } from 'react';
import { apiGet } from '../api/client';
import { ContingencyList } from './ContingencyList';
import { BranchOffice } from '../types';

export function ContingencyPage() {
  const [branches, setBranches] = useState<BranchOffice[]>([]);

  useEffect(() => {
    apiGet<BranchOffice[]>('/branch_office/get_list_enabled')
      .then(setBranches)
      .catch(() => {});
  }, []);

  return <ContingencyList branches={branches} />;
}
