import { request } from 'umi';
import { message } from 'antd';

// Интерфейсы данных (полностью соответствуют бэкенду)
export interface TransferPlanDto {
  id: number;
  sourceSubdivisionId: number;
  sourceSubdivisionName: string;
  destinationSubdivisionId: number;
  destinationSubdivisionName: string;
  materialId: number;
  materialName: string;
  transferDate: string;
  quantity: number;
}

export interface TransferPlanCreateDto {
  sourceSubdivisionId: number;
  destinationSubdivisionId: number;
  materialId: number;
  transferDate: string;
  quantity: number;
}

export interface TransferPlanUpdateDto {
  sourceSubdivisionId?: number;
  destinationSubdivisionId?: number;
  materialId?: number;
  transferDate?: string;
  quantity?: number;
}

export interface YearlyCalculationRequest {
  year: number;
}

export interface TransferPlanCalculationResult {
  success: boolean;
  message: string;
  calculatedPlans: TransferPlanDto[];
  year: number;
  plansCount: number;
  details?: {
    productionSubdivisionsCount: number;
    tradingSubdivisionsCount: number;
    finishedProductsCount: number;
    monthsCalculated: number;
  };
}

// Основной сервис для работы с планами перемещений
const TransferPlanService = {
  // Получить все планы перемещений
  async getAllTransferPlans(): Promise<TransferPlanDto[]> {
    try {
      const response = await request('/api/TransferPlans/getAll', {
        method: 'POST',
      });
      return response;
    } catch (error) {
      message.error('Ошибка при загрузке планов перемещений');
      console.error('Error fetching transfer plans:', error);
      return [];
    }
  },

  // Получить план по ID
  async getTransferPlan(id: number): Promise<TransferPlanDto | null> {
    try {
      const response = await request(`/api/TransferPlans/${id}`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      message.error(`Ошибка при загрузке плана перемещения #${id}`);
      console.error(`Error fetching transfer plan ${id}:`, error);
      return null;
    }
  },

  // Создать новый план
  async createTransferPlan(data: TransferPlanCreateDto): Promise<TransferPlanDto | null> {
    try {
      const response = await request('/api/TransferPlans', {
        method: 'POST',
        data,
      });
      message.success('План перемещения успешно создан');
      return response;
    } catch (error: any) {
      const errorMsg = error?.data?.message || 'Ошибка при создании плана перемещения';
      message.error(errorMsg);
      console.error('Error creating transfer plan:', error);
      return null;
    }
  },

  // Обновить план
  async updateTransferPlan(id: number, data: TransferPlanUpdateDto): Promise<boolean> {
    try {
      await request(`/api/TransferPlans/${id}`, {
        method: 'PUT',
        data,
      });
      message.success('План перемещения успешно обновлен');
      return true;
    } catch (error: any) {
      const errorMsg = error?.data?.message || 'Ошибка при обновлении плана перемещения';
      message.error(errorMsg);
      console.error(`Error updating transfer plan ${id}:`, error);
      return false;
    }
  },

  // Удалить план
  async deleteTransferPlan(id: number): Promise<boolean> {
    try {
      await request(`/api/TransferPlans/${id}`, {
        method: 'DELETE',
      });
      message.success('План перемещения успешно удален');
      return true;
    } catch (error) {
      message.error('Ошибка при удалении плана перемещения');
      console.error(`Error deleting transfer plan ${id}:`, error);
      return false;
    }
  },

  // Рассчитать годовой план
  async calculateYearlyTransferPlan(year: number): Promise<TransferPlanCalculationResult> {
    try {
      const response = await request('/api/TransferPlans/calculate-year', {
        method: 'POST',
        data: { year },
      });
      
      if (response.success) {
        message.success(response.message || `План перемещений на ${year} год успешно рассчитан`);
      } else {
        message.warning(response.message || 'Расчет завершен с предупреждениями');
      }
      
      return response;
    } catch (error) {
      const errorMsg = 'Ошибка при расчете плана перемещения';
      message.error(errorMsg);
      console.error('Error calculating yearly transfer plan:', error);
      
      return {
        success: false,
        message: errorMsg,
        calculatedPlans: [],
        year,
        plansCount: 0,
      };
    }
  },

  // Тестовый расчет
  async testCalculation(year: number): Promise<TransferPlanCalculationResult> {
    try {
      const response = await request('/api/TransferPlans/calculate-test', {
        method: 'POST',
        data: { year },
      });
      
      if (response.success) {
        message.success(response.message || 'Тестовый расчет выполнен успешно');
      }
      
      return response;
    } catch (error) {
      const errorMsg = 'Ошибка при тестовом расчете';
      message.error(errorMsg);
      console.error('Error in test calculation:', error);
      
      return {
        success: false,
        message: errorMsg,
        calculatedPlans: [],
        year,
        plansCount: 0,
      };
    }
  },
};

export default TransferPlanService;