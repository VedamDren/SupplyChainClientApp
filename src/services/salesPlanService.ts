import { request } from '@umijs/max';

// Получаем токен из localStorage
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || 
           localStorage.getItem('access_token') || 
           sessionStorage.getItem('token') ||
           sessionStorage.getItem('access_token');
  }
  return null;
};

// Обертка для request с автоматической авторизацией
const authRequest = async <T = any>(url: string, options: any = {}): Promise<T> => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  
  return request<T>(url, {
    ...options,
    headers,
  }) as Promise<T>;
};

// ============================================
// ОСНОВНЫЕ ИНТЕРФЕЙСЫ
// ============================================

export interface SalesPlanResponseDto {
  id: number;
  subdivisionId: number;
  subdivisionName: string;
  materialId: number;
  materialName: string;
  date: string; // Формат: "YYYY-MM-DD"
  quantity: number;
  createdByUserName?: string;
  lastModifiedByUserName?: string;
  createdDate?: string;
  lastModifiedDate?: string;
  preparedByInfo?: string;
}

export interface SalesPlanCreateDto {
  subdivisionId: number;
  materialId: number;
  date: string; // Формат: "YYYY-MM-DD"
  quantity: number;
  createdByUserId?: number;
  preparedByInfo?: string;
}

export interface SalesPlanUpdateDto {
  subdivisionId?: number;
  materialId?: number;
  date?: string; // Формат: "YYYY-MM-DD"
  quantity?: number;
  lastModifiedByUserId?: number;
  preparedByInfo?: string;
}

// Интерфейс для upsert с monthKey
export interface SalesPlanUpsertInput {
  subdivisionId: number;
  materialId: number;
  monthKey: string; // Формат: "YYYY-MM"
  quantity: number; // int
}

// Интерфейс для поиска
export interface SalesPlanSearchDto {
  subdivisionId?: number;
  materialId?: number;
  startDate?: string;
  endDate?: string;
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Проверяет формат monthKey (YYYY-MM)
 */
function isValidMonthKey(monthKey: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return regex.test(monthKey);
}

// ============================================
// ОСНОВНЫЕ МЕТОДЫ API
// ============================================

/**
 * Получить все планы продаж
 */
export async function getAllSalesPlans(): Promise<SalesPlanResponseDto[]> {
  try {
    console.log('Запрос всех планов продаж...');
    
    const result = await authRequest<SalesPlanResponseDto[]>('/api/SalesPlans/getAll', {
      method: 'POST',
    });
    
    console.log('Планы продаж получены:', result?.length || 0, 'записей');
    return result || [];
  } catch (error: any) {
    console.error('Ошибка при получении планов продаж:', error);
    
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
    }
    
    return [];
  }
}

/**
 * Получить план продаж по ID
 */
export async function getSalesPlanById(id: number): Promise<SalesPlanResponseDto> {
  try {
    console.log('Запрос плана продаж по ID:', id);
    
    const result = await authRequest<SalesPlanResponseDto>(`/api/SalesPlans/${id}`, {
      method: 'GET',
    });
    
    console.log('План продаж получен:', result);
    return result;
  } catch (error: any) {
    console.error('Ошибка при получении плана продаж по ID:', error);
    
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
    }
    
    throw error;
  }
}

/**
 * Создать новый план продаж
 */
export async function createSalesPlan(data: SalesPlanCreateDto): Promise<SalesPlanResponseDto> {
  try {
    console.log('Создание плана продаж:', data);
    
    const result = await authRequest<SalesPlanResponseDto>('/api/SalesPlans', {
      method: 'POST',
      data,
    });
    
    console.log('План продаж создан успешно:', result);
    return result;
  } catch (error: any) {
    console.error('Ошибка при создании плана продаж:', error);
    
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
      
      if (error.response.status === 400) {
        throw new Error(error.response.data?.message || 'План продаж с такими параметрами уже существует');
      }
    }
    
    throw error;
  }
}

/**
 * Обновить существующий план продаж
 */
export async function updateSalesPlan(id: number, data: SalesPlanUpdateDto): Promise<void> {
  try {
    console.log('Обновление плана продаж ID:', id, 'данные:', data);
    
    await authRequest(`/api/SalesPlans/${id}`, {
      method: 'PUT',
      data,
    });
    
    console.log('План продаж успешно обновлен');
  } catch (error: any) {
    console.error('Ошибка при обновлении плана продаж:', error);
    
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
    }
    
    throw error;
  }
}

/**
 * Создать или обновить месячный план продаж (UPSERT) - основной метод
 */
export async function upsertMonthlySalesPlan(data: SalesPlanUpsertInput): Promise<SalesPlanResponseDto> {
  try {
    console.log('UPSERT плана продаж:', data);
    
    // Проверяем формат monthKey
    if (!isValidMonthKey(data.monthKey)) {
      throw new Error(`Неверный формат monthKey: ${data.monthKey}. Используйте формат YYYY-MM`);
    }
    
    const result = await authRequest<SalesPlanResponseDto>('/api/SalesPlans/upsertMonthly', {
      method: 'POST',
      data,
    });
    
    console.log('UPSERT выполнен успешно:', result);
    return result;
  } catch (error: any) {
    console.error('Ошибка при сохранении плана продаж:', error);
    
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
      
      throw {
        apiError: {
          message: error.response.data?.message || error.message || 'Ошибка при сохранении плана продаж',
          status: error.response.status,
          details: error.response.data?.error || error.response.data || 'Неизвестная ошибка',
        }
      };
    }
    
    throw error;
  }
}

/**
 * Поиск планов продаж по параметрам
 */
export async function searchSalesPlans(params: SalesPlanSearchDto): Promise<SalesPlanResponseDto[]> {
  try {
    console.log('Поиск планов продаж с параметрами:', params);
    
    const result = await authRequest<SalesPlanResponseDto[]>('/api/SalesPlans/search', {
      method: 'POST',
      data: params,
    });
    
    console.log('Результаты поиска:', result?.length || 0, 'записей');
    return result || [];
  } catch (error: any) {
    console.error('Ошибка при поиске планов продаж:', error);
    
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
    }
    
    return [];
  }
}

/**
 * Удалить план продаж
 */
export async function deleteSalesPlan(id: number): Promise<void> {
  try {
    console.log('Удаление плана продаж с ID:', id);
    
    await authRequest(`/api/SalesPlans/${id}`, {
      method: 'DELETE',
    });
    
    console.log('План продаж успешно удален');
  } catch (error: any) {
    console.error('Ошибка при удалении плана продаж:', error);
    
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
    }
    
    throw error;
  }
}

/**
 * Получить матрицу плана продаж (заглушка)
 */
export async function getSalesPlanMatrix(year: number): Promise<any[]> {
  try {
    console.log(`Запрос матрицы плана продаж за ${year} год`);
    
    // Используем поиск
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const result = await searchSalesPlans({
      startDate,
      endDate,
    });
    
    console.log('Данные для матрицы получены:', result?.length || 0, 'записей');
    
    return result || [];
  } catch (error: any) {
    console.error('Ошибка при получении матрицы плана продаж:', error);
    return [];
  }
}

/**
 * Обновление месячного плана продаж (совместимость со старым кодом)
 * @deprecated Используйте upsertMonthlySalesPlan
 */
export async function updateMonthlySalesPlan(data: any): Promise<any> {
  console.warn('Метод updateMonthlySalesPlan устарел. Используйте upsertMonthlySalesPlan');
  
  // Автоматически определяем, какой метод использовать
  if (data.monthKey) {
    return await upsertMonthlySalesPlan(data as SalesPlanUpsertInput);
  } else {
    // Если нет monthKey, преобразуем
    const date = new Date(data.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    return await upsertMonthlySalesPlan({
      subdivisionId: data.subdivisionId,
      materialId: data.materialId,
      monthKey,
      quantity: data.quantity
    });
  }
}

// Экспортируем все типы и функции
export default {
  getAllSalesPlans,
  getSalesPlanById,
  createSalesPlan,
  updateSalesPlan,
  upsertMonthlySalesPlan,
  searchSalesPlans,
  deleteSalesPlan,
  getSalesPlanMatrix,
  updateMonthlySalesPlan,
};

// Экспортируем типы отдельно
