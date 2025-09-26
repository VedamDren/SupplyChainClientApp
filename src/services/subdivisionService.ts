import { request } from 'umi';
import type { SubdivisionDto, SubdivisionCreateDto, SubdivisionUpdateDto } from '@/models/subdivision';

export async function getSubdivisions() {
  return request<SubdivisionDto[]>('/api/Subdivisions/getAll', {
    method: 'POST',
  });
}

export async function getSubdivision(id: number) {
  return request<SubdivisionDto>(`/api/Subdivisions/${id}`, {
    method: 'GET',
  });
}

export async function createSubdivision(subdivision: SubdivisionCreateDto) {
  return request<SubdivisionDto>('/api/Subdivisions', {
    method: 'POST',
    data: subdivision,
  });
}

export async function updateSubdivision(id: number, subdivision: SubdivisionUpdateDto) {
  return request(`/api/Subdivisions/${id}`, {
    method: 'PUT',
    data: subdivision,
  });
}

export async function deleteSubdivision(id: number) {
  return request(`/api/Subdivisions/${id}`, {
    method: 'DELETE',
  });
}