import { useState, useCallback } from 'react';
import { message } from 'antd';
import type { TransferPlanDto, TransferPlanCalculationResult } from '@/services/transferPlan';

export interface TransferPlanState {
  list: TransferPlanDto[];
  loading: boolean;
  calculationLoading: boolean;
  calculationResult?: TransferPlanCalculationResult;
}

export default function useTransferPlanModel() {
  const [state, setState] = useState<TransferPlanState>({
    list: [],
    loading: false,
    calculationLoading: false,
  });

  // Получить все планы перемещений
  const fetchAll = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      // Динамический импорт, чтобы избежать циклических зависимостей
      const transferPlanService = await import('@/services/transferPlan');
      const response = await transferPlanService.default.getAllTransferPlans();
      setState(prev => ({ ...prev, list: response, loading: false }));
      return response;
    } catch (error) {
      message.error('Ошибка при загрузке планов перемещений');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  // Создать план перемещения
  const create = useCallback(async (data: any) => {
    try {
      const transferPlanService = await import('@/services/transferPlan');
      const response = await transferPlanService.default.createTransferPlan(data);
      
      if (response) {
        // Обновляем список после создания
        fetchAll();
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }, [fetchAll]);

  // Обновить план перемещения
  const update = useCallback(async (id: number, data: any) => {
    try {
      const transferPlanService = await import('@/services/transferPlan');
      const success = await transferPlanService.default.updateTransferPlan(id, data);
      
      if (success) {
        // Обновляем список после обновления
        fetchAll();
      }
      
      return success;
    } catch (error) {
      throw error;
    }
  }, [fetchAll]);

  // Удалить план перемещения
  const deletePlan = useCallback(async (id: number) => {
    try {
      const transferPlanService = await import('@/services/transferPlan');
      const success = await transferPlanService.default.deleteTransferPlan(id);
      
      if (success) {
        // Обновляем список после удаления
        fetchAll();
      }
      
      return success;
    } catch (error) {
      throw error;
    }
  }, [fetchAll]);

  // Рассчитать годовой план
  const calculateYearly = useCallback(async (year: number) => {
    setState(prev => ({ ...prev, calculationLoading: true }));
    try {
      const transferPlanService = await import('@/services/transferPlan');
      const result = await transferPlanService.default.calculateYearlyTransferPlan(year);
      
      setState(prev => ({ 
        ...prev, 
        calculationResult: result,
        calculationLoading: false 
      }));
      
      if (result.success) {
        // Обновляем список после расчета
        fetchAll();
      }
      
      return result;
    } catch (error) {
      message.error('Ошибка при расчете плана перемещения');
      setState(prev => ({ ...prev, calculationLoading: false }));
      throw error;
    }
  }, [fetchAll]);

  return {
    state,
    fetchAll,
    create,
    update,
    deletePlan,
    calculateYearly,
  };
}