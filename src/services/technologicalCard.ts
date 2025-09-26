import { request } from '@umijs/max';
import type { 
  TechnologicalCardDto, 
  TechnologicalCardCreateDto, 
  TechnologicalCardUpdateDto 
} from '@/models/technologicalCard';
import type { SubdivisionDto } from '@/models/subdivision';
import type { MaterialDto } from '@/models/material';

export async function getAllTechnologicalCards() {
  return request<TechnologicalCardDto[]>('/api/TechnologicalCards/getAll', {
    method: 'POST',
  });
}

export async function getTechnologicalCard(id: number) {
  return request<TechnologicalCardDto>(`/api/TechnologicalCards/${id}`, {
    method: 'GET',
  });
}

export async function createTechnologicalCard(data: TechnologicalCardCreateDto) {
  return request<TechnologicalCardDto>('/api/TechnologicalCards', {
    method: 'POST',
    data,
  });
}

export async function updateTechnologicalCard(id: number, data: TechnologicalCardUpdateDto) {
  return request(`/api/TechnologicalCards/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteTechnologicalCard(id: number) {
  return request(`/api/TechnologicalCards/${id}`, {
    method: 'DELETE',
  });
}

// Получаем только производственные подразделения
export async function getProductionSubdivisions() {
  const allSubdivisions = await request<SubdivisionDto[]>('/api/Subdivisions/getAll', {
    method: 'POST',
  });
  return allSubdivisions.filter(sub => sub.type === 'Production');
}

// Получаем только готовую продукцию
export async function getFinishedProducts() {
  const allMaterials = await request<MaterialDto[]>('/api/Materials/GetAll', {
    method: 'POST',
  });
  return allMaterials.filter(material => material.type === 'FinishedProduct');
}

// Получаем только сырье
export async function getRawMaterials() {
  const allMaterials = await request<MaterialDto[]>('/api/Materials/GetAll', {
    method: 'POST',
  });
  return allMaterials.filter(material => material.type === 'RawMaterial');
}