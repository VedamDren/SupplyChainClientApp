import { request } from 'umi';
import { SubdivisionDto, SubdivisionType, SubdivisionTypeLabels } from '@/models/subdivision';
import { MaterialDto, MaterialType, MaterialTypeLabels } from '@/models/material';

// Существующие типы для месячного расчета
export interface CalculationRequest {
  month: number;
  year: number;
  subdivisionId: number;
  rawMaterialId: number;
}

export interface ProductionPlanDetail {
  materialId: number;
  materialName: string;
  productionQuantity: number;
  planDate: string;
}

export interface CalculationResult {
  subdivisionId: number;
  subdivisionName: string;
  rawMaterialId: number;
  rawMaterialName: string;
  writeOffDate: string;
  calculatedQuantity: number;
  productionPlans: ProductionPlanDetail[];
  calculationFormula: string;
  note: string;
}

// Новые типы для годового расчета
export interface YearlyCalculationRequest {
  year: number;
  subdivisionId: number;
  rawMaterialId: number;
}

export interface MonthlyCalculationResult {
  month: number;
  monthName: string;
  year: number;
  calculatedQuantity: number;
  productionPlansCount: number;
  calculationFormula: string;
  note: string;
  productionPlans?: ProductionPlanDetail[];
}

export interface YearlyCalculationResult {
  subdivisionId: number;
  subdivisionName: string;
  rawMaterialId: number;
  rawMaterialName: string;
  year: number;
  totalQuantity: number;
  averageMonthlyQuantity: number;
  monthlyResults: MonthlyCalculationResult[];
  calculationSummary: string;
}

export interface RawMaterialWriteOff {
  id: number;
  subdivisionId: number;
  subdivisionName: string;
  rawMaterialId: number;
  rawMaterialName: string;
  writeOffDate: string;
  quantity: number;
  isCalculated: boolean;
  calculationNote: string;
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
 * Сервис для работы с расчетом списания сырья
 */
const RawMaterialWriteOffService = {
  /**
   * Расчет плана списания сырья на месяц (без сохранения)
   * @deprecated Используйте calculateYearly для годового расчета
   * @param data - параметры расчета
   */
  async calculate(data: CalculationRequest): Promise<APIResponse<CalculationResult>> {
    try {
      const response = await request('/api/RawMaterialWriteOffs/Calculate', {
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // Обработка разных форматов ответа
      let resultData: CalculationResult;
      if (response && typeof response === 'object') {
        if ('data' in response) {
          resultData = response.data;
        } else if ('result' in response) {
          resultData = response.result;
        } else {
          resultData = response as CalculationResult;
        }
      } else {
        resultData = response;
      }

      return { success: true, data: resultData };
    } catch (error: any) {
      console.error('Ошибка расчета:', error);
      return {
        success: false,
        error: error.message || 'Ошибка при расчете плана списания'
      };
    }
  },

  /**
   * Расчет и сохранение плана списания сырья на месяц
   * @deprecated Используйте calculateAndSaveYearly для годового расчета
   * @param data - параметры расчета
   */
  async calculateAndSave(data: CalculationRequest): Promise<APIResponse<RawMaterialWriteOff>> {
    try {
      const response = await request('/api/RawMaterialWriteOffs/CalculateAndSave', {
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return { success: true, data: response };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка при сохранении плана списания'
      };
    }
  },

  /**
   * Расчет годового плана списания сырья (без сохранения)
   * @param data - параметры годового расчета
   */
  async calculateYearly(data: YearlyCalculationRequest): Promise<APIResponse<YearlyCalculationResult>> {
    try {
      console.log('Отправка запроса на расчет годового плана:', data);
      
      const response = await request('/api/RawMaterialWriteOffs/CalculateYearly', {
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Получен ответ от сервера (годовой план):', response);

      // Обработка разных форматов ответа
      let resultData: YearlyCalculationResult;
      if (Array.isArray(response)) {
        // Если ответ - массив, преобразуем в ожидаемую структуру
        const monthlyResults: MonthlyCalculationResult[] = response.map((item: any) => ({
          month: item.month || 1,
          monthName: item.monthName || this.getMonthName(item.month || 1),
          year: item.year || data.year,
          calculatedQuantity: item.calculatedQuantity || 0,
          productionPlansCount: item.productionPlansCount || 0,
          calculationFormula: item.calculationFormula || '',
          note: item.note || '',
          productionPlans: item.productionPlans || []
        }));

        resultData = {
          subdivisionId: data.subdivisionId,
          subdivisionName: '', // Будет заполнено позже
          rawMaterialId: data.rawMaterialId,
          rawMaterialName: '', // Будет заполнено позже
          year: data.year,
          totalQuantity: monthlyResults.reduce((sum, item) => sum + (item.calculatedQuantity || 0), 0),
          averageMonthlyQuantity: 0, // Рассчитаем ниже
          monthlyResults,
          calculationSummary: `Рассчитано ${monthlyResults.length} месяцев`
        };

        // Рассчитываем среднемесячное значение
        const monthsWithData = monthlyResults.filter(m => m.calculatedQuantity > 0).length;
        resultData.averageMonthlyQuantity = monthsWithData > 0 
          ? resultData.totalQuantity / monthsWithData 
          : 0;
      } else if (response && typeof response === 'object') {
        if ('data' in response) {
          resultData = response.data;
        } else if ('result' in response) {
          resultData = response.result;
        } else {
          resultData = response as YearlyCalculationResult;
        }
      } else {
        // Если ответ не в ожидаемом формате, создаем пустой результат
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
      console.error('Ошибка расчета годового плана:', error);
      
      let errorMsg = 'Произошла ошибка при расчете годового плана';
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

  /**
   * Расчет и сохранение годового плана списания сырья
   * @param data - параметры годового расчета
   */
  async calculateAndSaveYearly(data: YearlyCalculationRequest): Promise<APIResponse<RawMaterialWriteOff[]>> {
    try {
      const response = await request('/api/RawMaterialWriteOffs/CalculateAndSaveYearly', {
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return { success: true, data: response };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка при сохранении годового плана'
      };
    }
  },

  /**
   * Получение всех расчетных списаний
   */
  async getCalculatedWriteOffs(): Promise<APIResponse<RawMaterialWriteOff[]>> {
    try {
      const response = await request('/api/RawMaterialWriteOffs/Calculated', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      return { success: true, data: response };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка загрузки расчетных списаний'
      };
    }
  },

  /**
   * Получение расчетных списаний с фильтром (год, подразделение, сырье)
   * @param year - год (опционально)
   * @param subdivisionId - ID подразделения (опционально)
   * @param rawMaterialId - ID сырья (опционально)
   */
  async getCalculatedWriteOffsByFilter(
    year?: number,
    subdivisionId?: number,
    rawMaterialId?: number
  ): Promise<APIResponse<RawMaterialWriteOff[]>> {
    try {
      // Формируем параметры запроса
      const params: any = {};
      if (year !== undefined && year !== null) {
        params.year = year;
      }
      if (subdivisionId !== undefined && subdivisionId !== null && subdivisionId > 0) {
        params.subdivisionId = subdivisionId;
      }
      if (rawMaterialId !== undefined && rawMaterialId !== null && rawMaterialId > 0) {
        params.rawMaterialId = rawMaterialId;
      }
      
      console.log('Запрос списаний с фильтрами:', params);
      
      const response = await request('/api/RawMaterialWriteOffs/Calculated/Filter', {
        method: 'GET',
        params,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Получен ответ списаний:', response);
      
      // Обработка разных форматов ответа
      let data: RawMaterialWriteOff[] = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          data = response.data;
        } else if ('result' in response && Array.isArray(response.result)) {
          data = response.result;
        } else if ('items' in response && Array.isArray(response.items)) {
          data = response.items;
        } else {
          // Пытаемся найти массив в любом свойстве
          for (const key in response) {
            if (Array.isArray(response[key])) {
              data = response[key];
              break;
            }
          }
        }
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Ошибка загрузки списаний с фильтром:', error);
      
      // Если ошибка 404 или 400, возвращаем пустой массив (нет данных)
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.log('Нет данных для указанных фильтров');
        return { success: true, data: [] };
      }
      
      return {
        success: false,
        error: error.message || 'Ошибка загрузки истории расчетов'
      };
    }
  },

  /**
   * Получение всех списаний (включая не расчетные)
   */
  async getAllWriteOffs(): Promise<APIResponse<RawMaterialWriteOff[]>> {
    try {
      const response = await request('/api/RawMaterialWriteOffs', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      return { success: true, data: response };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка загрузки всех списаний'
      };
    }
  },

  /**
   * Получение списания по ID
   * @param id - ID списания
   */
  async getWriteOffById(id: number): Promise<APIResponse<RawMaterialWriteOff>> {
    try {
      const response = await request(`/api/RawMaterialWriteOffs/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      return { success: true, data: response };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка загрузки списания'
      };
    }
  },

  /**
   * Создание списания вручную
   * @param data - данные списания
   */
  async createWriteOff(data: any): Promise<APIResponse<RawMaterialWriteOff>> {
    try {
      const response = await request('/api/RawMaterialWriteOffs', {
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return { success: true, data: response };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка создания списания'
      };
    }
  },

  /**
   * Обновление списания
   * @param id - ID списания
   * @param data - данные для обновления
   */
  async updateWriteOff(id: number, data: any): Promise<APIResponse<void>> {
    try {
      await request(`/api/RawMaterialWriteOffs/${id}`, {
        method: 'PUT',
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка обновления списания'
      };
    }
  },

  /**
   * Удаление списания
   * @param id - ID списания
   */
  async deleteWriteOff(id: number): Promise<APIResponse<void>> {
    try {
      await request(`/api/RawMaterialWriteOffs/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Ошибка удаления списания'
      };
    }
  },

  /**
   * Получение всех подразделений (адаптировано по аналогии с рабочей страницей)
   */
  async getSubdivisions(): Promise<SubdivisionDto[]> {
    try {
      console.log('Загружаем подразделения...');
      
      // Пробуем разные эндпоинты по аналогии с рабочей страницей
      let response;
      
      try {
        // Сначала пробуем POST на /api/Subdivisions/getAll (как в рабочей странице)
        console.log('Пробуем POST на /api/Subdivisions/getAll');
        response = await request('/api/Subdivisions/getAll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        console.log('Ответ от /api/Subdivisions/getAll:', response);
      } catch (postError) {
        console.log('POST на /api/Subdivisions/getAll не сработал, пробуем GET на /api/Subdivisions');
        // Если не сработало, пробуем GET
        response = await request('/api/Subdivisions', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        console.log('Ответ от /api/Subdivisions:', response);
      }

      // Обрабатываем разные форматы ответа (как в рабочей странице)
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
          // Пытаемся найти массив в любом свойстве
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
    const allSubdivisions = await this.getSubdivisions();
    // Фильтруем производственные подразделения
    const productionSubdivisions = allSubdivisions.filter((sub: SubdivisionDto) => {
      const typeStr = String(sub.type).toLowerCase();
      return typeStr.includes('production') || typeStr === SubdivisionType.Production.toLowerCase();
    });
    
    console.log(`Найдено ${productionSubdivisions.length} производственных подразделений`);
    return productionSubdivisions;
  },

  /**
   * Получение всех материалов (адаптировано по аналогии с рабочей страницей)
   */
  async getMaterials(): Promise<MaterialDto[]> {
    try {
      console.log('Загружаем материалы...');
      
      const response = await request('/api/Materials', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Ответ материалов:', response);

      // Обрабатываем разные форматы ответа
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
    const allMaterials = await this.getMaterials();
    // Фильтруем сырьевые материалы
    const rawMaterials = allMaterials.filter((material: MaterialDto) => {
      const typeStr = String(material.type).toLowerCase();
      return typeStr.includes('raw') || typeStr === MaterialType.RawMaterial.toLowerCase();
    });
    
    console.log(`Найдено ${rawMaterials.length} сырьевых материалов`);
    return rawMaterials;
  },

  /**
   * Получение материалов по типу (сырье или готовая продукция)
   * @param type - тип материала
   */
  async getMaterialsByType(type: MaterialType): Promise<MaterialDto[]> {
    const allMaterials = await this.getMaterials();
    const typeStr = String(type).toLowerCase();
    return allMaterials.filter(material => 
      String(material.type).toLowerCase() === typeStr
    );
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
   * Получение списка годов для выпадающего списка
   */
  getYears(): SelectOption[] {
    const currentYear = new Date().getFullYear();
    const years: SelectOption[] = [];
    
    // Годы от текущего -5 до текущего +5
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
   * Форматирование числа с разделителями тысяч
   * @param value - числовое значение
   */
  formatNumber(value: number): string {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('ru-RU');
  },

  /**
   * Получение опций для подразделений с указанием типа
   */
  async getSubdivisionOptions(): Promise<SelectOption[]> {
    const subdivisions = await this.getProductionSubdivisions();
    return subdivisions.map(s => ({
      value: s.id,
      label: `${s.name} (${SubdivisionTypeLabels[s.type as SubdivisionType] || s.type})`
    }));
  },

  /**
   * Получение опций для материалов с указанием типа
   */
  async getMaterialOptions(): Promise<SelectOption[]> {
    const materials = await this.getRawMaterials();
    return materials.map(m => ({
      value: m.id,
      label: `${m.name} (${MaterialTypeLabels[m.type as MaterialType] || m.type})`
    }));
  },

  /**
   * Проверка валидности данных для расчета
   * @param data - данные для проверки
   */
  validateCalculationData(data: YearlyCalculationRequest): string | null {
    if (!data.year || data.year < 2020 || data.year > 2100) {
      return 'Некорректный год расчета (должен быть от 2020 до 2100)';
    }
    if (!data.subdivisionId || data.subdivisionId <= 0) {
      return 'Не выбрано подразделение';
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
    
    if (typeStr.includes('production')) {
      normalizedType = SubdivisionType.Production;
    } else if (typeStr.includes('trading')) {
      normalizedType = SubdivisionType.Trading;
    } else {
      // По умолчанию считаем производственным
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
    
    if (typeStr.includes('raw')) {
      normalizedType = MaterialType.RawMaterial;
    } else if (typeStr.includes('finished')) {
      normalizedType = MaterialType.FinishedProduct;
    } else {
      // По умолчанию считаем сырьем
      normalizedType = MaterialType.RawMaterial;
    }
    
    return {
      ...material,
      type: normalizedType
    };
  }
};

export default RawMaterialWriteOffService;