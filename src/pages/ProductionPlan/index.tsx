import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Form, 
  Select, 
  DatePicker, 
  Button, 
  Table, 
  message, 
  Spin, 
  Row, 
  Col,
  Space,
  Typography,
  Alert,
  Empty,
  Tooltip,
  Modal,
  Tag,
  Popconfirm,
  Tabs,
  Descriptions,
  Divider,
  Input
} from 'antd';
import dayjs from 'dayjs';
import type { TableColumnsType } from 'antd';
import { 
  SearchOutlined, 
  CalculatorOutlined,
  CalendarOutlined,
  ShopOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  EyeOutlined,
  FilterOutlined
} from '@ant-design/icons';

// Импортируем типы и сервис
import { SubdivisionType } from '@/models/subdivision';
import { MaterialType } from '@/models/material';
import ProductionPlanService from '@/services/productionPlanService';

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

// Интерфейсы для данных
interface ProductionPlanResult {
  date: string;
  productionPlan: number;
  currentInventory: number;
  previousInventory: number;
  transferQuantity: number;
}

interface SubdivisionDto {
  id: number;
  name: string;
  type: string | SubdivisionType;
  code?: string;
  description?: string;
}

interface MaterialDto {
  id: number;
  name: string;
  type: string | MaterialType;
  code?: string;
  unit?: string;
}

interface PlanComparisonModalData {
  visible: boolean;
  data: any | null;
  loading: boolean;
}

interface HistoryFilter {
  year?: number;
  subdivisionId?: number;
  materialId?: number;
}

const ProductionPlanPage = () => {
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [subdivisions, setSubdivisions] = useState<SubdivisionDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [yearlyResults, setYearlyResults] = useState<ProductionPlanResult[]>([]);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [historyPlans, setHistoryPlans] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [selectedSubdivision, setSelectedSubdivision] = useState<SubdivisionDto | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialDto | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<{
    subdivisions: string | null;
    materials: string | null;
  }>({
    subdivisions: null,
    materials: null
  });
  const [comparisonModal, setComparisonModal] = useState<PlanComparisonModalData>({
    visible: false,
    data: null,
    loading: false
  });
  const [activeTab, setActiveTab] = useState<string>('calculation');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveComment, setSaveComment] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  // Загружаем справочники при монтировании
  useEffect(() => {
    loadSubdivisions();
    loadMaterials();
  }, []);

  // Загружаем сохраненные планы при изменении параметров расчета
  useEffect(() => {
    if (selectedSubdivision && selectedMaterial && activeTab === 'calculation') {
      loadSavedPlans();
    }
  }, [selectedSubdivision, selectedMaterial, selectedYear, activeTab]);

  // Загружаем историю планов при изменении активной вкладки
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoryPlans();
    }
  }, [activeTab]);

  // Загружаем подразделения
  const loadSubdivisions = async () => {
    setLoading(true);
    try {
      console.log('Загружаем подразделения с /api/Subdivisions/getAll (POST)');
      
      const response = await fetch('/api/Subdivisions/getAll', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Ответ подразделений:', data);

      // Обрабатываем разные форматы ответа
      let subdivisionsData: SubdivisionDto[] = [];
      
      if (Array.isArray(data)) {
        subdivisionsData = data;
      } else if (data && typeof data === 'object') {
        if ('data' in data && Array.isArray(data.data)) {
          subdivisionsData = data.data;
        } else if ('result' in data && Array.isArray(data.result)) {
          subdivisionsData = data.result;
        } else if ('items' in data && Array.isArray(data.items)) {
          subdivisionsData = data.items;
        } else if (data.records && Array.isArray(data.records)) {
          subdivisionsData = data.records;
        } else {
          // Пытаемся найти массив в любом свойстве
          for (const key in data) {
            if (Array.isArray(data[key])) {
              subdivisionsData = data[key];
              break;
            }
          }
        }
      }

      if (subdivisionsData.length > 0) {
        console.log(`Получено ${subdivisionsData.length} подразделений`);
        
        // Фильтруем только производственные подразделения
        const productionSubdivisions = subdivisionsData.filter((sub: SubdivisionDto) => {
          const typeStr = String(sub.type).toLowerCase();
          return typeStr.includes('production') || typeStr === SubdivisionType.Production.toLowerCase();
        });

        console.log(`Найдено ${productionSubdivisions.length} производственных подразделений`);

        if (productionSubdivisions.length > 0) {
          // Нормализуем тип
          const normalizedSubdivisions = productionSubdivisions.map(sub => ({
            ...sub,
            type: String(sub.type).toLowerCase().includes('production') ? 
                  SubdivisionType.Production : 
                  (sub.type as string)
          }));

          setSubdivisions(normalizedSubdivisions);
          setApiEndpoints(prev => ({ ...prev, subdivisions: '/api/Subdivisions/getAll (POST)' }));
          
          // Устанавливаем первое подразделение по умолчанию
          if (normalizedSubdivisions.length > 0) {
            form.setFieldsValue({ subdivisionId: normalizedSubdivisions[0].id });
            setSelectedSubdivision(normalizedSubdivisions[0]);
          }

          message.success(`Загружено ${normalizedSubdivisions.length} производственных подразделений`);
        } else {
          console.warn('Не найдено производственных подразделений. Все типы:', 
            subdivisionsData.map(s => ({id: s.id, name: s.name, type: s.type}))
          );
          message.warning('Не найдено производственных подразделений');
        }
      } else {
        console.warn('Получен пустой список подразделений');
        message.warning('Не удалось загрузить подразделения (пустой ответ)');
      }

    } catch (error: any) {
      console.error('Ошибка загрузки подразделений:', error);
      
      let errorMsg = 'Произошла ошибка при загрузке подразделений';
      if (error.message) {
        errorMsg = `Ошибка: ${error.message}`;
      }
      
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем материалы
  const loadMaterials = async () => {
    setLoading(true);
    try {
      console.log('Загружаем материалы');
      
      const response = await fetch('/api/Materials', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Ответ материалов:', data);

      // Обрабатываем разные форматы ответа
      let materialsData: MaterialDto[] = [];
      
      if (Array.isArray(data)) {
        materialsData = data;
      } else if (data && typeof data === 'object') {
        if ('data' in data && Array.isArray(data.data)) {
          materialsData = data.data;
        } else if ('result' in data && Array.isArray(data.result)) {
          materialsData = data.result;
        } else if ('items' in data && Array.isArray(data.items)) {
          materialsData = data.items;
        } else if (data.records && Array.isArray(data.records)) {
          materialsData = data.records;
        } else {
          for (const key in data) {
            if (Array.isArray(data[key])) {
              materialsData = data[key];
              break;
            }
          }
        }
      }

      if (materialsData.length > 0) {
        console.log(`Получено ${materialsData.length} материалов`);
        
        // Фильтруем только готовую продукцию
        const finishedProducts = materialsData.filter((mat: MaterialDto) => {
          const typeStr = String(mat.type).toLowerCase();
          return typeStr.includes('finished') || typeStr === MaterialType.FinishedProduct.toLowerCase();
        });

        console.log(`Найдено ${finishedProducts.length} видов готовой продукции`);

        if (finishedProducts.length > 0) {
          // Нормализуем тип
          const normalizedMaterials = finishedProducts.map(mat => ({
            ...mat,
            type: String(mat.type).toLowerCase().includes('finished') ? 
                  MaterialType.FinishedProduct : 
                  (mat.type as string)
          }));

          setMaterials(normalizedMaterials);
          setApiEndpoints(prev => ({ ...prev, materials: '/api/Materials (GET)' }));
          
          // Устанавливаем первый материал по умолчанию
          if (normalizedMaterials.length > 0) {
            form.setFieldsValue({ materialId: normalizedMaterials[0].id });
            setSelectedMaterial(normalizedMaterials[0]);
          }

          message.success(`Загружено ${normalizedMaterials.length} видов готовой продукции`);
        } else {
          console.warn('Не найдено готовой продукции. Все типы:', 
            materialsData.map(m => ({id: m.id, name: m.name, type: m.type}))
          );
          message.warning('Не найдено готовой продукции');
        }
      } else {
        console.warn('Получен пустой список материалов');
        message.warning('Не удалось загрузить материалы (пустой ответ)');
      }

    } catch (error: any) {
      console.error('Ошибка загрузки материалов:', error);
      
      let errorMsg = 'Произошла ошибка при загрузке материалов';
      if (error.message) {
        errorMsg = `Ошибка: ${error.message}`;
      }
      
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем сохраненные планы для сравнения в расчете
  const loadSavedPlans = async () => {
    if (!selectedSubdivision || !selectedMaterial) return;
    
    setLoadingSavedPlans(true);
    try {
      const response = await ProductionPlanService.getSavedPlans(
        selectedSubdivision.id,
        selectedMaterial.id,
        selectedYear
      );
      
      if (response.success && response.data) {
        setSavedPlans(response.data);
        console.log(`Загружено ${response.data.length} сохраненных планов для сравнения`);
      } else if (response.error && !response.error.includes('404')) {
        message.warning(`Не удалось загрузить сохраненные планы: ${response.error}`);
      } else {
        setSavedPlans([]);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки сохраненных планов:', error);
      setSavedPlans([]);
    } finally {
      setLoadingSavedPlans(false);
    }
  };

  // Загружаем историю планов с фильтрами (адаптированная версия - используем существующие эндпоинты)
  const loadHistoryPlans = async () => {
    setLoadingHistory(true);
    try {
      const filterValues = filterForm.getFieldsValue();
      const filters: HistoryFilter = {
        year: filterValues.filterYear,
        subdivisionId: filterValues.filterSubdivisionId,
        materialId: filterValues.filterMaterialId
      };

      // Если все фильтры заполнены, загружаем планы для конкретных параметров
      if (filters.year && filters.subdivisionId && filters.materialId) {
        const response = await ProductionPlanService.getSavedPlans(
          filters.subdivisionId,
          filters.materialId,
          filters.year
        );
        
        if (response.success && response.data) {
          setHistoryPlans(response.data);
        } else {
          setHistoryPlans([]);
          if (response.error && !response.error.includes('404')) {
            message.warning(`Не удалось загрузить планы: ${response.error}`);
          }
        }
      } else {
        // Если фильтры не заполнены, показываем сообщение
        message.warning('Для загрузки истории заполните все фильтры (год, подразделение, материал)');
        setHistoryPlans([]);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки истории планов:', error);
      message.error(`Ошибка загрузки истории: ${error.message}`);
      setHistoryPlans([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Применяем фильтры для истории
  const handleApplyHistoryFilter = async () => {
    const filterValues = filterForm.getFieldsValue();
    
    // Проверяем, что все фильтры заполнены
    if (!filterValues.filterYear || !filterValues.filterSubdivisionId || !filterValues.filterMaterialId) {
      message.warning('Заполните все фильтры: год, подразделение и материал');
      return;
    }
    
    await loadHistoryPlans();
    message.success('Фильтры применены');
  };

  // Сбрасываем фильтры истории
  const handleResetHistoryFilter = () => {
    filterForm.resetFields();
    filterForm.setFieldsValue({
      filterYear: selectedYear,
    });
    setHistoryPlans([]);
  };

  // Рассчитать план производства на год
  const handleCalculateYearlyPlan = async (values: any) => {
    const { subdivisionId, materialId, year } = values;
    
    if (!subdivisionId || !materialId || !year) {
      message.warning('Заполните все обязательные поля');
      return;
    }
    
    setCalculating(true);
    try {
      const requestData = {
        subdivisionId: subdivisionId,
        materialId: materialId,
        date: `${year.year()}-01-01`
      };
      
      console.log('Отправка запроса на расчет:', requestData);
      
      const response = await ProductionPlanService.calculateYearlyProductionPlan(requestData);
      
      console.log('Ответ от сервера:', response);
      
      if (response.success && response.data) {
        // Сортируем результаты по дате
        const sortedResults = response.data.sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        setYearlyResults(sortedResults);
        
        // Устанавливаем выбранные объекты для отображения
        const selectedSub = subdivisions.find(s => s.id === subdivisionId);
        const selectedMat = materials.find(m => m.id === materialId);
        
        if (selectedSub) setSelectedSubdivision(selectedSub);
        if (selectedMat) setSelectedMaterial(selectedMat);
        
        setSelectedYear(year.year());
        
        // Вычисляем общий план
        const totalProduction = sortedResults.reduce((sum: number, item: any) => sum + item.productionPlan, 0);
        
        message.success(
          `Рассчитан план производства на ${year.year()} год. ` +
          `Общий план: ${totalProduction.toFixed(2)}`
        );
        
        // Загружаем сохраненные планы для сравнения
        loadSavedPlans();
      } else {
        message.warning(response.error || 'Нет данных для расчета');
        setYearlyResults([]);
      }
    } catch (error: any) {
      console.error('Ошибка расчета:', error);
      
      let errorMsg = 'Произошла ошибка при расчете';
      if (error.message) {
        errorMsg = `Ошибка: ${error.message}`;
      }
      
      message.error(errorMsg);
      setYearlyResults([]);
    } finally {
      setCalculating(false);
    }
  };

  // Показать модальное окно сохранения
  const showSaveModal = () => {
    setSaveComment('');
    setOverwriteExisting(true);
    setSaveModalVisible(true);
  };

  // Сохранить рассчитанные планы
  const handleSaveCalculatedPlans = async () => {
    if (!selectedSubdivision || !selectedMaterial || yearlyResults.length === 0) {
      message.warning('Сначала выполните расчет планов');
      return;
    }
    
    setSaving(true);
    try {
      const saveRequest = {
        subdivisionId: selectedSubdivision.id,
        materialId: selectedMaterial.id,
        calculatedPlans: yearlyResults,
        overwriteExisting: overwriteExisting,
        comment: saveComment || `Сохранено ${new Date().toLocaleString('ru-RU')}`
      };
      
      const response = await ProductionPlanService.saveCalculatedPlans(saveRequest);
      
      if (response.success) {
        message.success(`Успешно сохранено ${response.data?.length || 0} планов производства`);
        // Закрываем модальное окно
        setSaveModalVisible(false);
        // Обновляем список сохраненных планов
        loadSavedPlans();
        // Обновляем историю если активна вкладка истории
        if (activeTab === 'history') {
          loadHistoryPlans();
        }
      } else {
        message.error(`Ошибка сохранения: ${response.error}`);
      }
    } catch (error: any) {
      console.error('Ошибка сохранения:', error);
      message.error(`Ошибка сохранения: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Сравнить расчетные планы с сохраненными
  const handleComparePlans = async () => {
    if (!selectedSubdivision || !selectedMaterial || yearlyResults.length === 0) {
      message.warning('Сначала выполните расчет планов');
      return;
    }
    
    setComparisonModal({ ...comparisonModal, loading: true });
    
    try {
      const comparisonRequest = {
        subdivisionId: selectedSubdivision.id,
        materialId: selectedMaterial.id,
        calculatedPlans: yearlyResults
      };
      
      const response = await ProductionPlanService.comparePlans(comparisonRequest);
      
      if (response.success && response.data) {
        setComparisonModal({
          visible: true,
          data: response.data,
          loading: false
        });
      } else {
        message.error(`Ошибка сравнения: ${response.error}`);
        setComparisonModal({ ...comparisonModal, loading: false });
      }
    } catch (error: any) {
      console.error('Ошибка сравнения:', error);
      message.error(`Ошибка сравнения: ${error.message}`);
      setComparisonModal({ ...comparisonModal, loading: false });
    }
  };

  // Удалить сохраненные планы по году (используем существующий эндпоинт)
  const handleDeleteYearlyPlans = async () => {
    if (!selectedSubdivision || !selectedMaterial) {
      message.warning('Выберите подразделение и материал');
      return;
    }
    
    Modal.confirm({
      title: 'Удаление сохраненных планов',
      content: `Вы уверены, что хотите удалить все сохраненные планы производства 
                для "${selectedSubdivision.name}" / "${selectedMaterial.name}" за ${selectedYear} год?`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          const response = await ProductionPlanService.deleteYearlyPlans(
            selectedSubdivision.id,
            selectedMaterial.id,
            selectedYear
          );
          
          if (response.success) {
            message.success(response.data?.message || 'Планы успешно удалены');
            setSavedPlans([]);
            // Обновляем историю если активна вкладка истории
            if (activeTab === 'history') {
              loadHistoryPlans();
            }
          } else {
            message.error(`Ошибка удаления: ${response.error}`);
          }
        } catch (error: any) {
          message.error(`Ошибка удаления: ${error.message}`);
        }
      }
    });
  };

  // Обработчик изменения подразделения
  const handleSubdivisionChange = (value: number) => {
    const selectedSub = subdivisions.find(s => s.id === value);
    setSelectedSubdivision(selectedSub || null);
  };

  // Обработчик изменения материала
  const handleMaterialChange = (value: number) => {
    const selectedMat = materials.find(m => m.id === value);
    setSelectedMaterial(selectedMat || null);
  };

  // Колонки таблицы расчета
  const calculationColumns: TableColumnsType<ProductionPlanResult> = [
    {
      title: 'Месяц',
      dataIndex: 'date',
      key: 'date',
      width: 180,
      render: (text: string) => {
        try {
          const date = new Date(text);
          return date.toLocaleDateString('ru-RU', { 
            month: 'long',
            year: 'numeric'
          });
        } catch {
          return text;
        }
      },
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    },
    {
      title: 'План производства',
      dataIndex: 'productionPlan',
      key: 'productionPlan',
      width: 150,
      render: (val: number) => (
        <Text strong type={val >= 0 ? 'success' : 'danger'}>
          {val.toFixed(2)}
        </Text>
      ),
      sorter: (a, b) => a.productionPlan - b.productionPlan
    },
    {
      title: 'Запасы на начало',
      dataIndex: 'currentInventory',
      key: 'currentInventory',
      width: 150,
      render: (val: number) => val.toFixed(2)
    },
    {
      title: 'Запасы след. месяца',
      dataIndex: 'previousInventory',
      key: 'previousInventory',
      width: 150,
      render: (val: number) => val.toFixed(2)
    },
    {
      title: 'Перемещения',
      dataIndex: 'transferQuantity',
      key: 'transferQuantity',
      width: 150,
      render: (val: number) => (
        <Text type={val > 0 ? 'success' : val < 0 ? 'danger' : undefined}>
          {val.toFixed(2)}
        </Text>
      )
    },
    {
      title: 'Статус сохранения',
      key: 'savedStatus',
      width: 150,
      render: (_, record) => {
        const savedPlan = savedPlans.find((sp: any) => {
          const planDate = dayjs(sp.date);
          const resultDate = dayjs(record.date);
          return planDate.isSame(resultDate, 'month');
        });
        
        if (savedPlan) {
          const isMatch = Math.abs(savedPlan.quantity - record.productionPlan) < 0.01;
          return (
            <Tag 
              color={isMatch ? 'success' : 'warning'} 
              icon={isMatch ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            >
              {isMatch ? 'Сохранен' : 'Отличается'}
            </Tag>
          );
        }
        
        return <Tag color="default">Не сохранен</Tag>;
      }
    }
  ];

  // Колонки таблицы истории
  const historyColumns: TableColumnsType<any> = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('MM.YYYY'),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    },
    {
      title: 'Подразделение',
      dataIndex: 'subdivisionName',
      key: 'subdivisionName',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (quantity: number) => (
        <Tag color="blue" style={{ fontWeight: 'bold', fontSize: '14px' }}>
          {quantity}
        </Tag>
      ),
      sorter: (a, b) => a.quantity - b.quantity
    },
    {
      title: 'Год',
      key: 'year',
      width: 100,
      render: (record: any) => (
        <Text type="secondary">{dayjs(record.date).year()}</Text>
      )
    }
  ];

  // Статистика по сохраненным планам
  const savedPlansCount = savedPlans.length;
  const matchingPlansCount = yearlyResults.filter(result => {
    const savedPlan = savedPlans.find((sp: any) => 
      dayjs(sp.date).isSame(dayjs(result.date), 'month')
    );
    return savedPlan && Math.abs(savedPlan.quantity - result.productionPlan) < 0.01;
  }).length;

  // Компонент вкладки расчета
  const CalculationTab = () => (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CalculatorOutlined style={{ marginRight: 8 }} />
                Расчет плана производства
                {apiEndpoints.subdivisions && (
                  <Tooltip title={`Используется endpoint: ${apiEndpoints.subdivisions}`}>
                    <InfoCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                  </Tooltip>
                )}
              </div>
            }
            extra={
              <Space>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    loadSubdivisions();
                    loadMaterials();
                  }}
                  loading={loading}
                >
                  Обновить списки
                </Button>
                {savedPlansCount > 0 && (
                  <Tag color="blue" icon={<HistoryOutlined />}>
                    Сохранено: {savedPlansCount}
                  </Tag>
                )}
              </Space>
            }
            size="default"
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCalculateYearlyPlan}
              initialValues={{ 
                year: dayjs(`${selectedYear}-01-01`),
              }}
            >
              <Row gutter={[24, 16]}>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item
                    name="subdivisionId"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ShopOutlined style={{ marginRight: 8 }} />
                        <span>Производственное подразделение</span>
                      </div>
                    }
                    rules={[{ required: true, message: 'Выберите производственное подразделение' }]}
                    help={subdivisions.length === 0 ? (
                      <Text type="warning" style={{ fontSize: '12px' }}>
                        <WarningOutlined /> Не загружены производственные подразделения
                      </Text>
                    ) : null}
                  >
                    <Select 
                      placeholder="Выберите подразделение"
                      loading={loading}
                      showSearch
                      filterOption={(input, option: any) => {
                        const optionText = option?.children?.props?.children?.[0]?.props?.children || '';
                        return optionText.toLowerCase().includes(input.toLowerCase());
                      }}
                      onChange={handleSubdivisionChange}
                      notFoundContent={
                        <Empty 
                          image={Empty.PRESENTED_IMAGE_SIMPLE} 
                          description="Не найдено производственных подразделений"
                        />
                      }
                      dropdownStyle={{ minWidth: 400 }}
                      style={{ width: '100%' }}
                      size="large"
                    >
                      {subdivisions.map(sub => (
                        <Option key={sub.id} value={sub.id}>
                          <div style={{ padding: '4px 0' }}>
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>
                              {sub.name}
                              {sub.code && (
                                <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                                  ({sub.code})
                                </Text>
                              )}
                            </div>
                            {sub.description && (
                              <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                                {sub.description}
                              </div>
                            )}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12} lg={8}>
                  <Form.Item
                    name="materialId"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <AppstoreOutlined style={{ marginRight: 8 }} />
                        <span>Готовая продукция</span>
                      </div>
                    }
                    rules={[{ required: true, message: 'Выберите готовую продукцию' }]}
                    help={materials.length === 0 ? (
                      <Text type="warning" style={{ fontSize: '12px' }}>
                        <WarningOutlined /> Не загружена готовая продукция
                      </Text>
                    ) : null}
                  >
                    <Select 
                      placeholder="Выберите материал"
                      loading={loading}
                      showSearch
                      filterOption={(input, option: any) => {
                        const optionText = option?.children?.props?.children?.[0]?.props?.children || '';
                        return optionText.toLowerCase().includes(input.toLowerCase());
                      }}
                      onChange={handleMaterialChange}
                      notFoundContent={
                        <Empty 
                          image={Empty.PRESENTED_IMAGE_SIMPLE} 
                          description="Не найдено готовой продукции"
                        />
                      }
                      dropdownStyle={{ minWidth: 400 }}
                      style={{ width: '100%' }}
                      size="large"
                    >
                      {materials.map(mat => (
                        <Option key={mat.id} value={mat.id}>
                          <div style={{ padding: '4px 0' }}>
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>
                              {mat.name}
                              {mat.code && (
                                <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                                  ({mat.code})
                                </Text>
                              )}
                            </div>
                            {mat.unit && (
                              <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                                Ед. изм.: {mat.unit}
                              </div>
                            )}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12} lg={8}>
                  <Form.Item
                    name="year"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarOutlined style={{ marginRight: 8 }} />
                        <span>Год расчета</span>
                      </div>
                    }
                    rules={[{ required: true, message: 'Выберите год' }]}
                  >
                    <DatePicker 
                      picker="year"
                      style={{ width: '100%' }}
                      format="YYYY"
                      onChange={(date) => {
                        if (date) {
                          setSelectedYear(date.year());
                        }
                      }}
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row>
                <Col span={24}>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Space>
                      <Button 
                        type="primary" 
                        htmlType="submit"
                        icon={<CalculatorOutlined />}
                        loading={calculating}
                        size="large"
                        style={{ minWidth: 180 }}
                        disabled={subdivisions.length === 0 || materials.length === 0}
                      >
                        Рассчитать на год
                      </Button>
                      
                      <Button 
                        type="default"
                        onClick={() => {
                          loadSubdivisions();
                          loadMaterials();
                        }}
                        size="large"
                        icon={<ReloadOutlined />}
                      >
                        Перезагрузить справочники
                      </Button>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>
              
              {(subdivisions.length === 0 || materials.length === 0) && (
                <Alert
                  message="Внимание"
                  description={
                    <div>
                      <p>Не удалось загрузить один или несколько справочников:</p>
                      <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                        {subdivisions.length === 0 && (
                          <li>
                            <strong>Производственные подразделения:</strong> использует endpoint: /api/Subdivisions/getAll (POST)
                          </li>
                        )}
                        {materials.length === 0 && (
                          <li>
                            <strong>Готовая продукция:</strong> использует endpoint: /api/Materials (GET)
                          </li>
                        )}
                      </ul>
                      <p style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Проверьте консоль браузера для деталей ошибок
                        </Text>
                      </p>
                    </div>
                  }
                  type="warning"
                  showIcon
                  style={{ marginTop: 24 }}
                />
              )}
            </Form>
          </Card>
        </Col>
        
        {selectedSubdivision && selectedMaterial && (
          <Col span={24}>
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ marginRight: 8 }}>Расчет для:</span>
                  <span style={{ fontWeight: 500, margin: '0 4px' }}>
                    {selectedSubdivision.name}
                  </span>
                  <span style={{ margin: '0 4px' }}>/</span>
                  <span style={{ fontWeight: 500, margin: '0 4px' }}>
                    {selectedMaterial.name}
                  </span>
                  <span style={{ margin: '0 4px' }}>/</span>
                  <span style={{ fontWeight: 500, margin: '0 4px' }}>
                    {selectedYear} год
                  </span>
                  {savedPlansCount > 0 && (
                    <>
                      <span style={{ margin: '0 8px' }}>|</span>
                      <Tag color="blue" icon={<HistoryOutlined />}>
                        Сохранено: {savedPlansCount} планов
                      </Tag>
                    </>
                  )}
                </div>
              }
              type="info"
              showIcon
              action={
                <Space>
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={showSaveModal}
                    loading={saving}
                    disabled={yearlyResults.length === 0}
                  >
                    Сохранить расчет
                  </Button>

                  <Button 
                    type="default"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={handleComparePlans}
                    disabled={yearlyResults.length === 0}
                  >
                    Сравнить
                  </Button>

                  {savedPlansCount > 0 && (
                    <Popconfirm
                      title="Удаление сохраненных планов"
                      description="Вы уверены, что хотите удалить все сохраненные планы за этот год?"
                      onConfirm={handleDeleteYearlyPlans}
                      okText="Да"
                      cancelText="Нет"
                    >
                      <Button 
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      >
                        Удалить сохраненные
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              }
              style={{ marginBottom: 16 }}
            />
          </Col>
        )}
        
        {yearlyResults.length > 0 && (
          <Col span={24}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    План производства по месяцам ({selectedYear} год)
                    {loadingSavedPlans && (
                      <Spin size="small" style={{ marginLeft: 8 }} />
                    )}
                  </div>
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />}
                      onClick={showSaveModal}
                      loading={saving}
                      size="small"
                    >
                      Сохранить все
                    </Button>
                  </Space>
                </div>
              }
            >
              <Table
                dataSource={yearlyResults}
                columns={calculationColumns}
                rowKey="date"
                pagination={{
                  pageSize: 12,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Всего ${total} месяцев`
                }}
                size="middle"
                scroll={{ x: 'max-content' }}
                summary={(pageData) => {
                  const totalProduction = pageData.reduce((sum, item) => sum + item.productionPlan, 0);
                  const totalTransfer = pageData.reduce((sum, item) => sum + item.transferQuantity, 0);
                  
                  return (
                    <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                      <Table.Summary.Cell index={0}>Итого за год</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <Text strong type="success">{totalProduction.toFixed(2)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>-</Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <Text type={totalTransfer >= 0 ? 'success' : 'danger'}>{totalTransfer.toFixed(2)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <Tag color="blue">
                          {savedPlansCount} сохранено / {matchingPlansCount} совпадает
                        </Tag>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* Модальное окно сравнения планов */}
      <Modal
        title="Сравнение расчетных планов с сохраненными"
        open={comparisonModal.visible}
        onCancel={() => setComparisonModal({ ...comparisonModal, visible: false })}
        width={800}
        footer={[
          <Button key="close" onClick={() => setComparisonModal({ ...comparisonModal, visible: false })}>
            Закрыть
          </Button>
        ]}
      >
        {comparisonModal.data && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Подразделение" span={2}>
                <Text strong>{selectedSubdivision?.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Материал" span={2}>
                <Text strong>{selectedMaterial?.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Год">
                <Text strong>{comparisonModal.data.year}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Расчетных планов">
                <Tag color="blue">{comparisonModal.data.totalCalculatedPlans}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Сохраненных планов">
                <Tag color="green">{comparisonModal.data.totalSavedPlans}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Совпадающих">
                <Tag color="success">{comparisonModal.data.matchingPlans}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Отличающихся">
                <Tag color="warning">{comparisonModal.data.differentPlans}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Отсутствующих">
                <Tag color="default">{comparisonModal.data.missingPlans}</Tag>
              </Descriptions.Item>
            </Descriptions>

            {comparisonModal.data.details && comparisonModal.data.details.length > 0 && (
              <Table
                dataSource={comparisonModal.data.details}
                columns={[
                  {
                    title: 'Месяц',
                    dataIndex: 'date',
                    key: 'date',
                    render: (date: string) => dayjs(date).format('MMMM YYYY')
                  },
                  {
                    title: 'Расчетное',
                    dataIndex: 'calculatedQuantity',
                    key: 'calculatedQuantity',
                    render: (val: number) => <Text strong>{val.toFixed(2)}</Text>
                  },
                  {
                    title: 'Сохраненное',
                    dataIndex: 'savedQuantity',
                    key: 'savedQuantity',
                    render: (val: number) => <Text>{val.toFixed(2)}</Text>
                  },
                  {
                    title: 'Разница',
                    dataIndex: 'difference',
                    key: 'difference',
                    render: (val: number) => (
                      <Text type={Math.abs(val) < 0.01 ? 'success' : 'danger'}>
                        {val.toFixed(2)}
                      </Text>
                    )
                  },
                  {
                    title: 'Статус',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => {
                      let color = 'default';
                      if (status === 'Match') color = 'success';
                      if (status === 'Different') color = 'warning';
                      if (status === 'Not Saved') color = 'default';
                      return <Tag color={color}>{status}</Tag>;
                    }
                  }
                ]}
                pagination={false}
                size="small"
              />
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно сохранения планов */}
      <Modal
        title="Сохранение планов производства"
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        width={500}
        footer={[
          <Button key="cancel" onClick={() => setSaveModalVisible(false)}>
            Отмена
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            loading={saving}
            onClick={handleSaveCalculatedPlans}
          >
            Сохранить
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Перезаписать существующие планы">
            <Select
              value={overwriteExisting}
              onChange={setOverwriteExisting}
              style={{ width: '100%' }}
            >
              <Option value={true}>Да (удалить старые и сохранить новые)</Option>
              <Option value={false}>Нет (сохранить только новые месяцы)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Комментарий (необязательно)">
            <TextArea
              value={saveComment}
              onChange={(e) => setSaveComment(e.target.value)}
              placeholder="Введите комментарий к сохранению планов..."
              rows={3}
            />
          </Form.Item>
          <Alert
            message="Информация"
            description={
              <div>
                <p>Будет сохранено <strong>{yearlyResults.length}</strong> планов производства.</p>
                <p>Общее количество: <strong>{yearlyResults.reduce((sum, item) => sum + item.productionPlan, 0).toFixed(2)}</strong> ед.</p>
              </div>
            }
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    </>
  );

  // Компонент вкладки истории
  const HistoryTab = () => (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>Сохраненные планы производства</span>
            {historyPlans.length > 0 && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {historyPlans.length} записей
              </Tag>
            )}
          </Space>
        }
        bordered
        style={{ marginBottom: 24 }}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadHistoryPlans()}
            loading={loadingHistory}
          >
            Обновить
          </Button>
        }
      >
        {/* Фильтры */}
        <Card
          title={
            <Space>
              <FilterOutlined />
              <span>Фильтры (все обязательны для загрузки)</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Form
            form={filterForm}
            layout="horizontal"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="filterYear"
                  label="Год"
                  rules={[{ required: true, message: 'Выберите год' }]}
                >
                  <Select
                    placeholder="Выберите год"
                    options={Array.from({ length: 10 }, (_, i) => ({
                      label: dayjs().year() - 5 + i,
                      value: dayjs().year() - 5 + i
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="filterSubdivisionId"
                  label="Подразделение"
                  rules={[{ required: true, message: 'Выберите подразделение' }]}
                >
                  <Select
                    placeholder="Выберите подразделение"
                    showSearch
                    options={subdivisions.map(s => ({
                      label: s.name,
                      value: s.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="filterMaterialId"
                  label="Материал"
                  rules={[{ required: true, message: 'Выберите материал' }]}
                >
                  <Select
                    placeholder="Выберите материал"
                    showSearch
                    options={materials.map(m => ({
                      label: m.name,
                      value: m.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  icon={<FilterOutlined />}
                  onClick={handleApplyHistoryFilter}
                  loading={loadingHistory}
                >
                  Загрузить планы
                </Button>
                <Button
                  onClick={handleResetHistoryFilter}
                >
                  Сбросить фильтры
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Информация о фильтрах */}
        {historyPlans.length === 0 && !loadingHistory && (
          <Alert
            message="Информация"
            description="Для загрузки сохраненных планов заполните все фильтры выше и нажмите 'Загрузить планы'."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Таблица с данными */}
        <Table<any>
          columns={historyColumns}
          dataSource={historyPlans}
          rowKey="id"
          loading={loadingHistory}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Всего ${total} записей`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={loadingHistory ? "Загрузка..." : "Нет сохраненных планов по выбранным фильтрам"}
              />
            ),
          }}
          summary={() => {
            const totalQuantity = historyPlans.reduce((sum, item) => sum + (item.quantity || 0), 0);
            
            return historyPlans.length > 0 ? (
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <div style={{ textAlign: 'right' }}>
                    <Text strong>Итого:</Text>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <Text strong type="success">{totalQuantity} ед.</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} colSpan={2}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {historyPlans.length} записей
                    </Text>
                  </div>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null;
          }}
        />
      </Card>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <ShopOutlined style={{ marginRight: 12, color: '#1890ff' }} />
        Расчет и управление планом производства
      </Title>
      
      <Divider />
      
      {/* Переключение вкладок */}
      <div style={{ marginBottom: 24 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
        >
          <TabPane
            tab={
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                <CalculatorOutlined />
                Расчет на год
              </span>
            }
            key="calculation"
          />
          <TabPane
            tab={
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                <HistoryOutlined />
                Сохраненные планы
              </span>
            }
            key="history"
          />
        </Tabs>
      </div>

      {/* Контент вкладок */}
      <Spin 
        spinning={loading || calculating || saving} 
        tip={calculating ? 'Выполняется расчет...' : saving ? 'Сохранение...' : 'Загрузка...'}
      >
        {activeTab === 'calculation' ? <CalculationTab /> : <HistoryTab />}
      </Spin>
    </div>
  );
};

export default ProductionPlanPage;