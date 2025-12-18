import request from '@/utils/request';

// Интерфейсы
export interface InventoryPlanResponse {
  id: number;
  subdivisionName: string;
  materialName: string;
  date: string;
  quantity: number;
}

export interface InventoryCalculationRequest {
  subdivisionId: number;
  materialId: number;
  date: string;
}

export interface InventoryCalculationResult {
  date: string;
  inventoryPlan: number;
  salesPlan: number;
  stockNorm: number;
  daysInMonth: number;
  calculatedQuantity: number;
  isFixedPlan?: boolean;
  calculationType?: string;
  formula?: string;
  message?: string;
  subdivisionName?: string;
  materialName?: string;
}

export interface Subdivision {
  id: number;
  name: string;
  type?: string;
}

export interface Material {
  id: number;
  name: string;
  type?: string;
}

// Базовый URL для API
const API_BASE = '/api';

/**
 * Сервис для работы с планами запасов
 */

// Получить все планы запасов (GET метод)
export const getInventoryPlans = async (): Promise<InventoryPlanResponse[]> => {
  try {
    const response = await request<InventoryPlanResponse[]>(`${API_BASE}/InventoryPlans`, {
      method: 'GET',
    });
    return response || [];
  } catch (error) {
    console.error('Ошибка при получении планов запасов:', error);
    throw error;
  }
};

// Получить все планы запасов (POST метод для совместимости)
export const getAllInventoryPlans = async (): Promise<InventoryPlanResponse[]> => {
  try {
    const response = await request<InventoryPlanResponse[]>(`${API_BASE}/InventoryPlans/getAll`, {
      method: 'POST',
    });
    return response || [];
  } catch (error) {
    console.error('Ошибка при получении планов запасов (POST):', error);
    throw error;
  }
};

// Рассчитать план запасов - исправленная версия
export const calculateInventoryPlan = async (
  data: InventoryCalculationRequest
): Promise<InventoryCalculationResult> => {
  try {
    console.log('Отправляем запрос на расчет:', data);
    
    const response = await request<InventoryCalculationResult>(`${API_BASE}/InventoryPlans/calculate`, {
      method: 'POST',
      data,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Ответ от сервера:', response);
    return response;
  } catch (error: any) {
    console.error('Ошибка при расчете плана запасов:', error);
    
    // Добавляем больше информации об ошибке
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
      
      // Создаем структурированную ошибку
      const apiError = {
        apiError: {
          message: error.response.data?.message || 'Ошибка при расчете',
          status: error.response.status,
          details: error.response.data?.error || error.response.data,
        }
      };
      throw apiError;
    } else if (error.request) {
      console.error('Запрос отправлен, но ответ не получен');
      throw { apiError: { message: 'Сервер не ответил. Проверьте подключение к серверу.' } };
    } else {
      console.error('Ошибка настройки запроса:', error.message);
      throw { apiError: { message: error.message } };
    }
  }
};

// Создать план запасов
export const createInventoryPlan = async (data: {
  subdivisionId: number;
  materialId: number;
  date: string;
  quantity: number;
}): Promise<InventoryPlanResponse> => {
  try {
    const response = await request<InventoryPlanResponse>(`${API_BASE}/InventoryPlans`, {
      method: 'POST',
      data,
    });
    return response;
  } catch (error) {
    console.error('Ошибка при создании плана запасов:', error);
    throw error;
  }
};

// Удалить план запасов
export const deleteInventoryPlan = async (id: number): Promise<void> => {
  try {
    await request(`${API_BASE}/InventoryPlans/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Ошибка при удалении плана запасов:', error);
    throw error;
  }
};

// Получить план запасов по ID
export const getInventoryPlanById = async (id: number): Promise<InventoryPlanResponse> => {
  try {
    const response = await request<InventoryPlanResponse>(`${API_BASE}/InventoryPlans/${id}`, {
      method: 'GET',
    });
    return response;
  } catch (error) {
    console.error('Ошибка при получении плана запасов по ID:', error);
    throw error;
  }
};

// Получить список подразделений
export const getSubdivisions = async (): Promise<Subdivision[]> => {
  try {
    const response = await request<Subdivision[]>(`${API_BASE}/Subdivisions/getAll`, {
      method: 'POST',
    });
    return response || [];
  } catch (error) {
    console.error('Ошибка при получении подразделений:', error);
    throw error;
  }
};

// Получить список материалов
export const getMaterials = async (): Promise<Material[]> => {
  try {
    const response = await request<Material[]>(`${API_BASE}/Materials`, {
      method: 'GET',
    });
    return response || [];
  } catch (error) {
    console.error('Ошибка при получении материалов:', error);
    throw error;
  }
};