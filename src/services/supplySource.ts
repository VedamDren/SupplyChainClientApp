import { request } from '@umijs/max';
import type { 
  SupplySourceDto, 
  SupplySourceMatrixItem, 
  MonthlySupplySourceUpdateDto 
} from '@/models/supplySource';
import type { SubdivisionDto } from '@/models/subdivision';
import type { MaterialDto } from '@/models/material';

export async function getSupplySourceMatrix(year: number) {
  return request<{
    data: SupplySourceMatrixItem[];
    months: string[];
  }>('/api/SupplySources/matrix', {
    method: 'GET',
    params: { year },
  });
}

export async function updateMonthlySupplySource(params: MonthlySupplySourceUpdateDto) {
  return request('/api/SupplySources/updateMonthly', {
    method: 'POST',
    data: params,
  });
}

export async function getProductionSubdivisions() {
  return request<SubdivisionDto[]>('/api/Subdivisions', {
    method: 'GET',
    params: { type: 'Production' },
  });
}

export async function getFinishedProducts() {
  return request<MaterialDto[]>('/api/Materials', {
    method: 'GET',
    params: { type: 'FinishedProduct' },
  });
}

export async function getTradingSubdivisions() {
  return request<SubdivisionDto[]>('/api/Subdivisions', {
    method: 'GET',
    params: { type: 'Trading' },
  });
}