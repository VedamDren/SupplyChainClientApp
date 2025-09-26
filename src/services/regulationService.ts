import { request } from 'umi';
import type { RegulationDto, RegulationCreateDto, RegulationUpdateDto } from '@/models/regulation';

export async function getRegulations() {
  return request<RegulationDto[]>('/api/Regulations/getAll', {
    method: 'POST',
  });
}

export async function getRegulation(id: number) {
  return request<RegulationDto>(`/api/Regulations/${id}`, {
    method: 'GET',
  });
}

export async function createRegulation(regulation: RegulationCreateDto) {
  return request<RegulationDto>('/api/Regulations', {
    method: 'POST',
    data: regulation,
  });
}

export async function updateRegulation(id: number, regulation: RegulationUpdateDto) {
  return request(`/api/Regulations/${id}`, {
    method: 'PUT',
    data: regulation,
  });
}

export async function deleteRegulation(id: number) {
  return request(`/api/Regulations/${id}`, {
    method: 'DELETE',
  });
}