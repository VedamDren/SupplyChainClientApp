import { request } from 'umi';
import { SubdivisionDto, SubdivisionType, SubdivisionTypeLabels } from '@/models/subdivision';
import { MaterialDto, MaterialType, MaterialTypeLabels } from '@/models/material';

// Типы для расчета плана закупа
export interface RawMaterialPurchasePlanRequest {
  subdivisionId: number;
  rawMaterialId: number;
  year: number;
}

export interface MonthlyPurchasePlanResult {
  subdivisionId: any;
  rawMaterialId: any;
  month: number;
  monthName: string;
  year: number;
  date: string;
  purchasePlanQuantity: number;
  currentMonthInventory: number;
  nextMonthInventory: number;
  totalProductionPlans: number;
  calculationFormula: string;
  note?: string;
}

export interface YearlyPurchasePlanResult {
  subdivisionId: number;
  subdivisionName: string;
  rawMaterialId: number;
  rawMaterialName: string;
  year: number;
  totalQuantity: number;
  averageMonthlyQuantity: number;
  monthlyResults: MonthlyPurchasePlanResult[];
  calculationSummary: string;
}

export interface RawMaterialPurchaseDto {
  id: number;
  subdivisionId: number;
  subdivisionName: string;
  rawMaterialId: number;
  rawMaterialName: string;
  purchaseDate: string;
  quantity: number;
}

// Типы для выпадающих списков
export interface SelectOption {
  value: number;
  label: string;
}

// Тип для ответа API
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Сервис для работы с расчетом плана закупа сырья
 * Формула расчета: План закупа = Запасы след. месяца - Запасы тек. месяца + Сумма планов производства
 */
const RawMaterialPurchasePlanService = {
  /**
   * Расчет годового плана закупа сырья
   * @param data - параметры расчета
   */
  async calculateYearlyPlan(data: RawMaterialPurchasePlanRequest): Promise<APIResponse<YearlyPurchasePlanResult>> {
    try {
      console.log('Отправка запроса на расчет годового плана закупа:', data);
      
      const response = await request('/api/RawMaterialPurchases/CalculateYearPlan', {
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Получен ответ от сервера (годовой план закупа):', response);

      let resultData: YearlyPurchasePlanResult;
      
      if (response && typeof response === 'object') {
        const monthlyResults: MonthlyPurchasePlanResult[] = [];
        
        if (response.monthlyPlans && Array.isArray(response.monthlyPlans)) {
          monthlyResults.push(...response.monthlyPlans.map((item: any) => {
            const date = new Date(item.date);
            return {
              month: date.getMonth() + 1,
              monthName: this.getMonthName(date.getMonth() + 1),
              year: date.getFullYear(),
              date: item.date,
              purchasePlanQuantity: item.purchasePlanQuantity || 0,
              currentMonthInventory: item.currentMonthInventory || 0,
              nextMonthInventory: item.nextMonthInventory || 0,
              totalProductionPlans: item.totalProductionPlans || 0,
              calculationFormula: item.calculationFormula || '',
              note: item.note || ''
            };
          }));
        } else if (response.monthlyResults && Array.isArray(response.monthlyResults)) {
          monthlyResults.push(...response.monthlyResults);
        }

        resultData = {
          subdivisionId: response.subdivisionId || data.subdivisionId,
          subdivisionName: response.subdivisionName || '',
          rawMaterialId: response.rawMaterialId || data.rawMaterialId,
          rawMaterialName: response.rawMaterialName || '',
          year: response.year || data.year,
          totalQuantity: response.totalQuantity || monthlyResults.reduce((sum, item) => sum + (item.purchasePlanQuantity || 0), 0),
          averageMonthlyQuantity: response.averageMonthlyQuantity || 
            (monthlyResults.length > 0 ? monthlyResults.reduce((sum, item) => sum + (item.purchasePlanQuantity || 0), 0) / monthlyResults.length : 0),
          monthlyResults: monthlyResults,
          calculationSummary: response.calculationSummary || `Рассчитано ${monthlyResults.length} месяцев`
        };
      } else {
        resultData = {
          subdivisionId: data.subdivisionId,
          subdivisionName: '',
          rawMaterialId: data.rawMaterialId,
          rawMaterialName: '',
          year: data.year,
          totalQuantity: 0,
          averageMonthlyQuantity: 0,
          monthlyResults: [],
          calculationSummary: 'Нет данных для расчета'
        };
      }

      return { success: true, data: resultData };
    } catch (error: any) {
      console.error('Ошибка расчета годового плана закупа:', error);
      
      let errorMsg = 'Произошла ошибка при расчете годового плана закупа';
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data || error.response;
        
        if (status === 404) {
          errorMsg = 'Endpoint расчета не найден. Проверьте URL или метод контроллера.';
        } else if (status === 400) {
          errorMsg = `Неверные параметры запроса: ${typeof errorData === 'string' ? errorData : JSON.stringify(errorData)}`;
        } else if (status === 500) {
          errorMsg = 'Внутренняя ошибка сервера';
          if (errorData && typeof errorData === 'string') {
            errorMsg += `: ${errorData}`;
          }
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

  /**
   * Сохранение рассчитанного годового плана закупа
   * @param data - планы для сохранения
   */
  async saveYearlyPlan(purchasePlans: MonthlyPurchasePlanResult[]): Promise<APIResponse<RawMaterialPurchaseDto[]>> {
    try {
      const saveData = {
        purchasePlans: purchasePlans.map(plan => ({
          subdivisionId: plan.subdivisionId,
          rawMaterialId: plan.rawMaterialId,
          date: plan.date,
          purchasePlanQuantity: plan.purchasePlanQuantity,
          currentMonthInventory: plan.currentMonthInventory,
          nextMonthInventory: plan.nextMonthInventory,
          totalProductionPlans: plan.totalProductionPlans,
          calculationFormula: plan.calculationFormula,
          note: plan.note
        }))
      };

      console.log('Отправка данных для сохранения:', saveData);

      const response = await request('/api/RawMaterialPurchases/SaveYearPlan', {
        method: 'POST',
        data: saveData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Ответ сохранения плана:', response);

      let savedData: RawMaterialPurchaseDto[] = [];
      if (response && typeof response === 'object') {
        if (response.data && Array.isArray(response.data)) {
          savedData = response.data;
        } else if (Array.isArray(response)) {
          savedData = response;
        } else if (response.message) {
          console.log('План сохранен:', response.message);
        }
      }

      return { success: true, data: savedData };
    } catch (error: any) {
      console.error('Ошибка сохранения годового плана закупа:', error);
      
      let errorMsg = 'Ошибка при сохранении годового плана закупа';
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          errorMsg = 'Неверные данные для сохранения: ' + (error.response.data || '');
        } else if (status === 500) {
          errorMsg = 'Внутренняя ошибка сервера при сохранении';
        }
      }
      
      return {
        success: false,
        error: errorMsg
      };
    }
  },

  /**
   * Получение сохраненных планов закупа с использованием метода GetExistingPlans из контроллера
   * @param year - год (обязательно)
   * @param subdivisionId - ID подразделения (обязательно)
   * @param rawMaterialId - ID сырья (обязательно)
   */
  async getSavedPurchasePlans(
    year?: number,
    subdivisionId?: number,
    rawMaterialId?: number
  ): Promise<APIResponse<RawMaterialPurchaseDto[]>> {
    try {
      console.log('Параметры запроса сохраненных планов:', { year, subdivisionId, rawMaterialId });
      
      // Проверяем, что переданы все обязательные параметры для метода GetExistingPlans
      if (!year || !subdivisionId || !rawMaterialId) {
        console.log('Не все обязательные параметры переданы. year, subdivisionId и rawMaterialId обязательны.');
        return { success: true, data: [] };
      }

      // ИСПРАВЛЕНИЕ: Используем метод GetExistingPlans из контроллера с параметрами в пути
      const url = `/api/RawMaterialPurchases/GetExistingPlans/${subdivisionId}/${rawMaterialId}/${year}`;
      console.log('Отправка запроса на:', url);
      
      const response = await request(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Получен ответ от GetExistingPlans:', response);
      
      let data: RawMaterialPurchaseDto[] = [];
      
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object') {
        // Обрабатываем различные форматы ответа
        if ('data' in response && Array.isArray(response.data)) {
          data = response.data;
        } else if ('result' in response && Array.isArray(response.result)) {
          data = response.result;
        } else if ('items' in response && Array.isArray(response.items)) {
          data = response.items;
        } else {
          for (const key in response) {
            if (Array.isArray(response[key])) {
              data = response[key];
              break;
            }
          }
        }
      }

      console.log(`Получено ${data.length} сохраненных планов закупа`);

      // Сортируем по дате закупа (январь -> декабрь)
      const sortedData = data.sort((a, b) => {
        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        return dateA - dateB;
      });

      return { success: true, data: sortedData };
    } catch (error: any) {
      console.error('Ошибка загрузки планов закупа:', error);
      
      // Обработка ошибок с учетом специфики метода GetExistingPlans
      if (error.response?.status === 404) {
        console.log('Метод GetExistingPlans не найден или нет данных для указанных параметров');
        return { success: true, data: [] };
      }
      
      return {
        success: false,
        error: error.message || 'Ошибка загрузки сохраненных планов закупа'
      };
    }
  },

  /**
   * Получение всех подразделений через существующий API
   */
  async getSubdivisions(): Promise<SubdivisionDto[]> {
    try {
      console.log('Загружаем подразделения через существующий API...');
      
      let response;
      
      try {
        response = await request('/api/Subdivisions', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        console.log('Ответ от /api/Subdivisions:', response);
      } catch (getError: any) {
        console.log('GET на /api/Subdivisions не сработал, пробуем POST на /api/Subdivisions/getAll');
        response = await request('/api/Subdivisions/getAll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        console.log('Ответ от /api/Subdivisions/getAll:', response);
      }

      let subdivisionsData: SubdivisionDto[] = [];
      
      if (Array.isArray(response)) {
        subdivisionsData = response;
      } else if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          subdivisionsData = response.data;
        } else if ('result' in response && Array.isArray(response.result)) {
          subdivisionsData = response.result;
        } else if ('items' in response && Array.isArray(response.items)) {
          subdivisionsData = response.items;
        } else if (response.records && Array.isArray(response.records)) {
          subdivisionsData = response.records;
        } else {
          for (const key in response) {
            if (Array.isArray(response[key])) {
              subdivisionsData = response[key];
              break;
            }
          }
        }
      }

      console.log(`Получено ${subdivisionsData.length} подразделений`);
      return subdivisionsData;

    } catch (error: any) {
      console.error('Ошибка загрузки подразделений:', error);
      throw error;
    }
  },

  /**
   * Получение только производственных подразделений (тип Production)
   */
  async getProductionSubdivisions(): Promise<SubdivisionDto[]> {
    try {
      console.log('Загружаем производственные подразделения...');
      
      const allSubdivisions = await this.getSubdivisions();
      
      const productionSubdivisions = allSubdivisions.filter((sub: SubdivisionDto) => {
        const typeStr = String(sub.type).toLowerCase();
        return typeStr.includes('production') || 
               typeStr === SubdivisionType.Production.toLowerCase() ||
               typeStr === 'производственное';
      });
      
      console.log(`Найдено ${productionSubdivisions.length} производственных подразделений из ${allSubdivisions.length} всего`);
      
      const normalizedSubdivisions = productionSubdivisions.map(sub => 
        this.normalizeSubdivisionType(sub)
      );

      return normalizedSubdivisions;
      
    } catch (error: any) {
      console.error('Ошибка загрузки производственных подразделений:', error);
      return [];
    }
  },

  /**
   * Получение всех материалов через существующий API
   */
  async getMaterials(): Promise<MaterialDto[]> {
    try {
      console.log('Загружаем материалы через существующий API...');
      
      const response = await request('/api/Materials', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Ответ материалов:', response);

      let materialsData: MaterialDto[] = [];
      
      if (Array.isArray(response)) {
        materialsData = response;
      } else if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          materialsData = response.data;
        } else if ('result' in response && Array.isArray(response.result)) {
          materialsData = response.result;
        } else if ('items' in response && Array.isArray(response.items)) {
          materialsData = response.items;
        } else if (response.records && Array.isArray(response.records)) {
          materialsData = response.records;
        } else {
          for (const key in response) {
            if (Array.isArray(response[key])) {
              materialsData = response[key];
              break;
            }
          }
        }
      }

      console.log(`Получено ${materialsData.length} материалов`);
      return materialsData;

    } catch (error: any) {
      console.error('Ошибка загрузки материалов:', error);
      throw error;
    }
  },

  /**
   * Получение только сырьевых материалов (тип RawMaterial)
   */
  async getRawMaterials(): Promise<MaterialDto[]> {
    try {
      console.log('Загружаем сырьевые материалы...');
      
      const allMaterials = await this.getMaterials();
      
      const rawMaterials = allMaterials.filter((material: MaterialDto) => {
        const typeStr = String(material.type).toLowerCase();
        return typeStr.includes('raw') || 
               typeStr === MaterialType.RawMaterial.toLowerCase() ||
               typeStr === 'сырьё' ||
               typeStr === 'сырье';
      });
      
      console.log(`Найдено ${rawMaterials.length} сырьевых материалов из ${allMaterials.length} всего`);
      
      const normalizedMaterials = rawMaterials.map(mat => 
        this.normalizeMaterialType(mat)
      );

      return normalizedMaterials;
      
    } catch (error: any) {
      console.error('Ошибка загрузки сырьевых материалов:', error);
      return [];
    }
  },

  /**
   * Получение списка годов для выпадающего списка
   */
  getYears(): SelectOption[] {
    const currentYear = new Date().getFullYear();
    const years: SelectOption[] = [];
    
    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
      years.push({ value: year, label: year.toString() });
    }
    
    return years;
  },

  /**
   * Получение текущего года
   */
  getCurrentYear(): number {
    return new Date().getFullYear();
  },

  /**
   * Получение названия месяца по номеру
   * @param monthNumber - номер месяца (1-12)
   */
  getMonthName(monthNumber: number): string {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[monthNumber - 1] || `Месяц ${monthNumber}`;
  },

  /**
   * Форматирование числа с разделителями тысяч
   * @param value - числовое значение
   */
  formatNumber(value: number): string {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('ru-RU');
  },

  /**
   * Форматирование даты для отображения
   * @param dateString - строка с датой
   */
  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return dateString;
    }
  },

  /**
   * Проверка валидности данных для расчета
   * @param data - данные для проверки
   */
  validateCalculationData(data: RawMaterialPurchasePlanRequest): string | null {
    if (!data.year || data.year < 2020 || data.year > 2100) {
      return 'Некорректный год расчета (должен быть от 2020 до 2100)';
    }
    if (!data.subdivisionId || data.subdivisionId <= 0) {
      return 'Не выбрано производственное подразделение';
    }
    if (!data.rawMaterialId || data.rawMaterialId <= 0) {
      return 'Не выбрано сырье';
    }
    return null;
  },

  /**
   * Нормализация типа подразделения
   */
  normalizeSubdivisionType(subdivision: SubdivisionDto): SubdivisionDto {
    const typeStr = String(subdivision.type).toLowerCase();
    let normalizedType: SubdivisionType;
    
    if (typeStr.includes('production') || typeStr === 'производственное') {
      normalizedType = SubdivisionType.Production;
    } else if (typeStr.includes('trading') || typeStr === 'торговое') {
      normalizedType = SubdivisionType.Trading;
    } else {
      normalizedType = SubdivisionType.Production;
    }
    
    return {
      ...subdivision,
      type: normalizedType
    };
  },

  /**
   * Нормализация типа материала
   */
  normalizeMaterialType(material: MaterialDto): MaterialDto {
    const typeStr = String(material.type).toLowerCase();
    let normalizedType: MaterialType;
    
    if (typeStr.includes('raw') || typeStr === 'сырьё' || typeStr === 'сырье') {
      normalizedType = MaterialType.RawMaterial;
    } else if (typeStr.includes('finished') || typeStr.includes('продукция')) {
      normalizedType = MaterialType.FinishedProduct;
    } else {
      normalizedType = MaterialType.RawMaterial;
    }
    
    return {
      ...material,
      type: normalizedType
    };
  },

  /**
   * Получение опций для подразделений для выпадающих списков
   */
  async getSubdivisionOptions(): Promise<SelectOption[]> {
    try {
      const subdivisions = await this.getProductionSubdivisions();
      return subdivisions.map(s => ({
        value: s.id,
        label: s.name
      }));
    } catch (error) {
      console.error('Ошибка получения опций подразделений:', error);
      return [];
    }
  },

  /**
   * Получение опций для материалов для выпадающих списков
   */
  async getMaterialOptions(): Promise<SelectOption[]> {
    try {
      const materials = await this.getRawMaterials();
      return materials.map(m => ({
        value: m.id,
        label: m.name
      }));
    } catch (error) {
      console.error('Ошибка получения опций материалов:', error);
      return [];
    }
  },

  /**
   * Получение списка месяцев для выпадающего списка
   */
  getMonths(): SelectOption[] {
    return [
      { value: 1, label: 'Январь' },
      { value: 2, label: 'Февраль' },
      { value: 3, label: 'Март' },
      { value: 4, label: 'Апрель' },
      { value: 5, label: 'Май' },
      { value: 6, label: 'Июнь' },
      { value: 7, label: 'Июль' },
      { value: 8, label: 'Август' },
      { value: 9, label: 'Сентябрь' },
      { value: 10, label: 'Октябрь' },
      { value: 11, label: 'Ноябрь' },
      { value: 12, label: 'Декабрь' },
    ];
  },

  /**
   * Перерасчет планов закупа
   */
  async recalculatePlans(data: RawMaterialPurchasePlanRequest): Promise<APIResponse<YearlyPurchasePlanResult>> {
    try {
      console.log('Отправка запроса на перерасчет планов:', data);
      
      const response = await request('/api/RawMaterialPurchases/RecalculatePlans', {
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Ответ перерасчета:', response);

      let resultData: YearlyPurchasePlanResult;
      
      if (response && typeof response === 'object') {
        const monthlyResults: MonthlyPurchasePlanResult[] = [];
        
        if (response.monthlyPlans && Array.isArray(response.monthlyPlans)) {
          monthlyResults.push(...response.monthlyPlans.map((item: any) => {
            const date = new Date(item.date);
            return {
              month: date.getMonth() + 1,
              monthName: this.getMonthName(date.getMonth() + 1),
              year: date.getFullYear(),
              date: item.date,
              purchasePlanQuantity: item.purchasePlanQuantity || 0,
              currentMonthInventory: item.currentMonthInventory || 0,
              nextMonthInventory: item.nextMonthInventory || 0,
              totalProductionPlans: item.totalProductionPlans || 0,
              calculationFormula: item.calculationFormula || '',
              note: item.note || ''
            };
          }));
        }

        resultData = {
          subdivisionId: response.subdivisionId || data.subdivisionId,
          subdivisionName: response.subdivisionName || '',
          rawMaterialId: response.rawMaterialId || data.rawMaterialId,
          rawMaterialName: response.rawMaterialName || '',
          year: response.year || data.year,
          totalQuantity: response.totalQuantity || monthlyResults.reduce((sum, item) => sum + (item.purchasePlanQuantity || 0), 0),
          averageMonthlyQuantity: response.averageMonthlyQuantity || 
            (monthlyResults.length > 0 ? monthlyResults.reduce((sum, item) => sum + (item.purchasePlanQuantity || 0), 0) / monthlyResults.length : 0),
          monthlyResults: monthlyResults,
          calculationSummary: response.calculationSummary || `Перерасчет выполнен для ${monthlyResults.length} месяцев`
        };
      } else {
        resultData = {
          subdivisionId: data.subdivisionId,
          subdivisionName: '',
          rawMaterialId: data.rawMaterialId,
          rawMaterialName: '',
          year: data.year,
          totalQuantity: 0,
          averageMonthlyQuantity: 0,
          monthlyResults: [],
          calculationSummary: 'Ошибка перерасчета'
        };
      }

      return { success: true, data: resultData };
    } catch (error: any) {
      console.error('Ошибка перерасчета планов:', error);
      
      let errorMsg = 'Произошла ошибка при перерасчете планов';
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          errorMsg = 'Метод перерасчета не найден';
        } else if (status === 400) {
          errorMsg = 'Неверные параметры перерасчета';
        } else if (status === 500) {
          errorMsg = 'Внутренняя ошибка сервера при перерасчете';
        }
      }
      
      return {
        success: false,
        error: errorMsg
      };
    }
  }
};

export default RawMaterialPurchasePlanService;