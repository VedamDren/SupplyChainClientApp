import request from '@/utils/request';

// Базовый URL для API запросов
// Используем относительный путь, так как проксирование будет обрабатывать перенаправление
const API_BASE = '/api';

// Интерфейсы для типизации данных
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
  date: string; // Формат: "YYYY-MM-DD"
}

export interface InventoryCalculationResult {
  date: string; // Формат: "YYYY-MM-DD"
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

//Сервис для работы с планами запасов

//Получить все планы запасов (GET метод)
 
export const getInventoryPlans = async (): Promise<InventoryPlanResponse[]> => {
  try {
    console.log('Запрос всех планов запасов...');
    const response = await request<InventoryPlanResponse[]>(`${API_BASE}/InventoryPlans`, {
      method: 'GET',
    });
    console.log('Планы запасов получены:', response?.length || 0, 'записей');
    return response || [];
  } catch (error) {
    console.error('Ошибка при получении планов запасов:', error);
    throw error;
  }
};

 //Рассчитать план запасов
export const calculateInventoryPlan = async (
  data: InventoryCalculationRequest
): Promise<InventoryCalculationResult> => {
  try {
    console.log('Отправка запроса на расчет плана запасов:', {
      ...data,
      requestUrl: `${API_BASE}/InventoryPlans/calculate`,
    });

    // Валидация данных перед отправкой
    if (!data.subdivisionId || !data.materialId || !data.date) {
      throw new Error('Не все обязательные поля заполнены');
    }

    // Формируем полный URL для диагностики
    const fullUrl = `${window.location.origin}${API_BASE}/InventoryPlans/calculate`;
    console.log('Полный URL запроса:', fullUrl);

    // Отправляем запрос
    const response = await request<InventoryCalculationResult>(`${API_BASE}/InventoryPlans/calculate`, {
      method: 'POST',
      data,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('Успешный ответ от сервера расчета:', response);
    return response;
    
  } catch (error: any) {
    console.error('Детали ошибки расчета плана запасов:');
    console.error('Тип ошибки:', error?.constructor?.name);
    console.error('Сообщение:', error?.message);
    console.error('Статус:', error?.response?.status);
    console.error('Данные ошибки:', error?.response?.data);
    console.error('Полная ошибка:', error);

    // Создаем структурированную ошибку для лучшей обработки на фронтенде
    const structuredError = {
      apiError: {
        message: error?.response?.data?.message || error?.message || 'Ошибка при расчете плана запасов',
        status: error?.response?.status,
        details: error?.response?.data?.error || error?.response?.data || 'Неизвестная ошибка',
        suggestion: 'Проверьте подключение к серверу и правильность данных',
      }
    };

    throw structuredError;
  }
};

//Создать план запасов

export const createInventoryPlan = async (data: {
  subdivisionId: number;
  materialId: number;
  date: string; // Формат: "YYYY-MM-DD"
  quantity: number;
}): Promise<InventoryPlanResponse> => {
  try {
    console.log('Создание плана запасов:', data);
    const response = await request<InventoryPlanResponse>(`${API_BASE}/InventoryPlans`, {
      method: 'POST',
      data,
    });
    console.log('План запасов создан успешно:', response);
    return response;
  } catch (error) {
    console.error('Ошибка при создании плана запасов:', error);
    throw error;
  }
};

//Удалить план запасов

export const deleteInventoryPlan = async (id: number): Promise<void> => {
  try {
    console.log('Удаление плана запасов с ID:', id);
    await request(`${API_BASE}/InventoryPlans/${id}`, {
      method: 'DELETE',
    });
    console.log('План запасов успешно удален');
  } catch (error) {
    console.error('Ошибка при удалении плана запасов:', error);
    throw error;
  }
};

// Получить план запасов по ID
 
export const getInventoryPlanById = async (id: number): Promise<InventoryPlanResponse> => {
  try {
    console.log('Запрос плана запасов по ID:', id);
    const response = await request<InventoryPlanResponse>(`${API_BASE}/InventoryPlans/${id}`, {
      method: 'GET',
    });
    console.log('План запасов получен:', response);
    return response;
  } catch (error) {
    console.error('Ошибка при получении плана запасов по ID:', error);
    throw error;
  }
};

//Получить список подразделений

export const getSubdivisions = async (): Promise<Subdivision[]> => {
  try {
    console.log('Запрос списка подразделений...');
    const response = await request<Subdivision[]>(`${API_BASE}/InventoryPlans/subdivisions`, {
      method: 'GET',
    });
    console.log('Подразделения получены:', response?.length || 0, 'записей');
    return response || [];
  } catch (error) {
    console.error('Ошибка при получении подразделений:', error);
    throw error;
  }
};

//Получить список материалов

export const getMaterials = async (): Promise<Material[]> => {
  try {
    console.log('Запрос списка материалов...');
    const response = await request<Material[]>(`${API_BASE}/InventoryPlans/materials`, {
      method: 'GET',
    });
    console.log('Материалы получены:', response?.length || 0, 'записей');
    return response || [];
  } catch (error) {
    console.error('Ошибка при получении материалов:', error);
    throw error;
  }
};