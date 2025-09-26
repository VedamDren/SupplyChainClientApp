import { request } from 'umi';
import type { MaterialDto, MaterialCreateDto, MaterialUpdateDto } from '@/models/material';

export async function getMaterials() {
  return request<MaterialDto[]>('/api/Materials', {
    method: 'POST',
  });
}

export async function getMaterial(id: number) {
  return request<MaterialDto>(`/api/Materials/${id}`, {
    method: 'GET',
  });
}

export async function createMaterial(material: MaterialCreateDto) {
  return request<MaterialDto>('/api/Materials', {
    method: 'POST',
    data: material,
  });
}

export async function updateMaterial(id: number, material: MaterialUpdateDto) {
  return request(`/api/Materials/${id}`, {
    method: 'PUT',
    data: material,
  });
}

export async function deleteMaterial(id: number) {
  return request(`/api/Materials/${id}`, {
    method: 'DELETE',
  });
}