
import { request } from 'umi';
import {
  ProductionPlanCalculationRequest,
  ProductionPlanCalculationResult,
  ProductionPlanResponseDto,
  SaveProductionPlanRequestDto,
  PlanComparisonRequestDto,
  PlanComparisonResultDto,
  APIResponse
} from '@/models/productionPlan';

const ProductionPlanService = {

//Рассчитать план производства на год

  async calculateYearlyProductionPlan(
    requestData: ProductionPlanCalculationRequest
  ): Promise<APIResponse<ProductionPlanCalculationResult[]>> {
    try {
      console.log('Отправка запроса на расчет:', requestData);
      
      const response = await request('/api/ProductionCalculation/CalculateYearlyProductionPlan', {
        method: 'POST',
        data: requestData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Получен ответ от сервера:', response);

      // Прямой возврат массива
      if (Array.isArray(response)) {
        return { success: true, data: response };
      }
      
      // Если ответ в формате { data: [...] }
      if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        return { success: true, data: response.data };
      }
      
      // Если ответ в формате { result: [...] }
      if (response && typeof response === 'object' && 'result' in response && Array.isArray(response.result)) {
        return { success: true, data: response.result };
      }

      return { success: true, data: response || [] };
    } catch (error: any) {
      console.error('Ошибка при расчете:', error);
      
      let errorMsg = 'Произошла ошибка при расчете плана производства';
      
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          errorMsg = 'Endpoint расчета не найден';
        } else if (status === 400) {
          errorMsg = 'Неверные параметры запроса';
        } else if (status === 500) {
          errorMsg = 'Внутренняя ошибка сервера';
        }
      } else if (error.message) {
        errorMsg = `Ошибка: ${error.message}`;
      } else if (error.data) {
        errorMsg = `Ошибка сервера: ${JSON.stringify(error.data)}`;
      }
      
      return { 
        success: false, 
        error: errorMsg 
      };
    }
  },

//Сохранить рассчитанные планы

  async saveCalculatedPlans(
    requestData: SaveProductionPlanRequestDto
  ): Promise<APIResponse<ProductionPlanResponseDto[]>> {
    try {
      const response = await request('/api/ProductionCalculation/SaveCalculatedPlan', {
        method: 'POST',
        data: requestData,
      });

      return { success: true, data: response };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Ошибка сохранения планов' 
      };
    }
  },

// Получить сохраненные планы

  async getSavedPlans(
    subdivisionId: number, 
    materialId: number, 
    year: number
  ): Promise<APIResponse<ProductionPlanResponseDto[]>> {
    try {
      const response = await request(`/api/ProductionCalculation/GetSavedPlans/${subdivisionId}/${materialId}/${year}`, {
        method: 'GET',
      });

      return { success: true, data: response };
    } catch (error: any) {
      // Если планов нет (404), возвращаем пустой массив
      if (error.response?.status === 404) {
        return { success: true, data: [] };
      }
      return { 
        success: false, 
        error: error.message || 'Ошибка загрузки сохраненных планов' 
      };
    }
  },

// Сравнить планы

  async comparePlans(
    requestData: PlanComparisonRequestDto
  ): Promise<APIResponse<PlanComparisonResultDto>> {
    try {
      const response = await request('/api/ProductionCalculation/ComparePlans', {
        method: 'POST',
        data: requestData,
      });

      return { success: true, data: response };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Ошибка сравнения планов' 
      };
    }
  },

//Удалить планы

  async deleteYearlyPlans(
    subdivisionId: number, 
    materialId: number, 
    year: number
  ): Promise<APIResponse<{ deletedCount: number; message: string }>> {
    try {
      const response = await request(`/api/ProductionCalculation/DeleteYearlyPlans/${subdivisionId}/${materialId}/${year}`, {
        method: 'DELETE',
      });

      return { success: true, data: response };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Ошибка удаления планов' 
      };
    }
  },

// Отладить данные о перемещениях

  async debugTransfers(
    subdivisionId: number, 
    materialId: number, 
    year: number
  ): Promise<APIResponse<any>> {
    try {
      const response = await request(`/api/ProductionCalculation/DebugTransfers/${subdivisionId}/${materialId}/${year}`, {
        method: 'GET',
      });

      return { success: true, data: response };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Ошибка отладки перемещений' 
      };
    }
  },

// Получить историю планов с фильтрами

  async getHistoryPlans(
    year?: number,
    subdivisionId?: number,
    materialId?: number
  ): Promise<APIResponse<ProductionPlanResponseDto[]>> {
    try {
      let url = '/api/ProductionCalculation/GetHistoryPlans';
      const params = new URLSearchParams();
      
      if (year) params.append('year', year.toString());
      if (subdivisionId) params.append('subdivisionId', subdivisionId.toString());
      if (materialId) params.append('materialId', materialId.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await request(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      console.error('Ошибка загрузки истории планов:', error);
      
      // Если endpoint не существует (404), возвращаем пустой массив
      if (error.response?.status === 404) {
        return { success: true, data: [] };
      }
      
      return {
        success: false,
        error: error.message || 'Не удалось загрузить историю планов',
      };
    }
  },

// Удалить план по ID

  async deleteProductionPlan(id: number): Promise<APIResponse<void>> {
    try {
      await request(`/api/ProductionCalculation/DeletePlan/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Ошибка удаления плана:', error);
      
      // Если план не найден (404), считаем успешным удаление
      if (error.response?.status === 404) {
        return { success: true };
      }
      
      return {
        success: false,
        error: error.message || 'Не удалось удалить план',
      };
    }
  }
};

export default ProductionPlanService;