// Элемент плана продаж
export interface SalesPlanItem {
  id: number;
  subdivisionId: number;
  materialId: number;
  date: string;
  quantity: number;
  createdByUserId?: number;
  lastModifiedByUserId?: number;
  createdDate?: string;
  lastModifiedDate?: string;
  preparedByInfo?: string;
  subdivisionName?: string;
  materialName?: string;
  createdByUserName?: string;
  lastModifiedByUserName?: string;
}

// Ответ матрицы плана продаж
export interface SalesPlanMatrixResponse {
  items: SalesPlanItem[];
  year: number;
  total: number;
}

// Запрос на обновление месячного плана
export interface UpdateSalesPlanRequest {
  subdivisionId: number;
  materialId: number;
  date: string; // Формат: YYYY-MM-DD
  quantity: number;
}

// DTO для создания плана продаж
export interface CreateSalesPlanDto {
  subdivisionId: number;
  materialId: number;
  date: string;
  quantity: number;
}

// Фильтр для поиска планов
export interface SalesPlanFilter {
  year?: number;
  month?: number;
  subdivisionId?: number;
  materialId?: number;
  page?: number;
  pageSize?: number;
}

// Ответ поиска
export interface SalesPlanSearchResponse {
  items: SalesPlanItem[];
  total: number;
  page: number;
  pageSize: number;
}