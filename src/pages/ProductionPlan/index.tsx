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
  Popconfirm
} from 'antd';
import dayjs from 'dayjs';
import { request } from '@umijs/max';
import type { TableColumnsType } from 'antd';
import { 
  SearchOutlined, 
  CalendarOutlined,
  ShopOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  SyncOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined
} from '@ant-design/icons';

// Импортируем типы из моделей
import { SubdivisionType } from '@/models/subdivision';
import { MaterialType } from '@/models/material';

// Импортируем сервис
import { 
  SaveProductionPlanRequestDto,
  PlanComparisonRequestDto,
  PlanComparisonResultDto,
  ProductionPlanResponseDto
} from '@/models/productionPlan';
import ProductionPlanService from '@/services/productionPlanService';

const { Option } = Select;
const { Title, Text } = Typography;

// Интерфейсы
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
  data: PlanComparisonResultDto | null;
  loading: boolean;
}

const ProductionPlanPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false);
  const [subdivisions, setSubdivisions] = useState<SubdivisionDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [yearlyResults, setYearlyResults] = useState<ProductionPlanResult[]>([]);
  const [savedPlans, setSavedPlans] = useState<ProductionPlanResponseDto[]>([]);
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

  // Загружаем справочники при монтировании
  useEffect(() => {
    loadSubdivisions();
    loadMaterials();
  }, []);

  // Загружаем сохраненные планы при изменении параметров
  useEffect(() => {
    if (selectedSubdivision && selectedMaterial) {
      loadSavedPlans();
    }
  }, [selectedSubdivision, selectedMaterial, selectedYear]);

  // Загружаем подразделения по известному endpoint
  const loadSubdivisions = async () => {
    setLoading(true);
    try {
      console.log('Загружаем подразделения с /api/Subdivisions/getAll (POST)');
      
      const response = await request('/api/Subdivisions/getAll', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Ответ подразделений:', response);

      // Обрабатываем разные форматы ответа
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
      if (error.response?.status) {
        errorMsg = `Ошибка ${error.response.status}: ${error.response.statusText}`;
      } else if (error.message) {
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
      
      const response = await request('/api/Materials', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
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
      if (error.response?.status) {
        errorMsg = `Ошибка ${error.response.status}: ${error.response.statusText}`;
      } else if (error.message) {
        errorMsg = `Ошибка: ${error.message}`;
      }
      
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем сохраненные планы
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
        console.log(`Загружено ${response.data.length} сохраненных планов`);
      } else if (response.error && !response.error.includes('404')) {
        message.warning(`Не удалось загрузить сохраненные планы: ${response.error}`);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки сохраненных планов:', error);
      // Не показываем ошибку, если просто нет сохраненных планов
      if (!error.message?.includes('404')) {
        message.error(`Ошибка загрузки сохраненных планов: ${error.message}`);
      }
    } finally {
      setLoadingSavedPlans(false);
    }
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
        const sortedResults = response.data.sort((a, b) => 
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
        const totalProduction = sortedResults.reduce((sum, item) => sum + item.productionPlan, 0);
        
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
      if (error.data) {
        errorMsg = `Ошибка расчета: ${error.data}`;
      } else if (error.message) {
        errorMsg = `Ошибка: ${error.message}`;
      }
      
      message.error(errorMsg);
      setYearlyResults([]);
    } finally {
      setCalculating(false);
    }
  };

  // Сохранить рассчитанные планы
  const handleSaveCalculatedPlans = async () => {
    if (!selectedSubdivision || !selectedMaterial || yearlyResults.length === 0) {
      message.warning('Сначала выполните расчет планов');
      return;
    }
    
    setSaving(true);
    try {
      const saveRequest: SaveProductionPlanRequestDto = {
        subdivisionId: selectedSubdivision.id,
        materialId: selectedMaterial.id,
        calculatedPlans: yearlyResults,
        overwriteExisting: true,
        comment: `Сохранено ${new Date().toLocaleString('ru-RU')}`
      };
      
      const response = await ProductionPlanService.saveCalculatedPlans(saveRequest);
      
      if (response.success) {
        message.success(`Успешно сохранено ${response.data?.length || 0} планов производства`);
        // Обновляем список сохраненных планов
        loadSavedPlans();
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
      const comparisonRequest: PlanComparisonRequestDto = {
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

  // Удалить сохраненные планы
  const handleDeleteSavedPlans = async () => {
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

  // Колонки таблицы
  const columns: TableColumnsType<ProductionPlanResult> = [
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
      title: 'Формула расчета',
      key: 'formula',
      width: 250,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {record.previousInventory.toFixed(2)} - {record.currentInventory.toFixed(2)} + {record.transferQuantity.toFixed(2)} = {record.productionPlan.toFixed(2)}
        </Text>
      )
    },
    {
      title: 'Статус сохранения',
      key: 'savedStatus',
      width: 150,
      render: (_, record) => {
        const savedPlan = savedPlans.find(sp => {
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

  // Статистика по сохраненным планам
  const savedPlansCount = savedPlans.length;
  const matchingPlansCount = yearlyResults.filter(result => {
    const savedPlan = savedPlans.find(sp => 
      dayjs(sp.date).isSame(dayjs(result.date), 'month')
    );
    return savedPlan && Math.abs(savedPlan.quantity - result.productionPlan) < 0.01;
  }).length;

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <ShopOutlined style={{ marginRight: 12, color: '#1890ff' }} />
        Расчет и управление планом производства на год
      </Title>
      
      <Spin spinning={loading || calculating || saving} tip={calculating ? 'Выполняется расчет...' : saving ? 'Сохранение...' : 'Загрузка...'}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <SearchOutlined style={{ marginRight: 8 }} />
                  Параметры расчета
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
                        disabledDate={(current) => {
                          return false;
                        }}
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
                          icon={<SearchOutlined />}
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
                      onClick={handleSaveCalculatedPlans}
                      loading={saving}
                      disabled={yearlyResults.length === 0}
                    >
                      Сохранить все
                    </Button>

                    {savedPlansCount > 0 && (
                      <Popconfirm
                        title="Удаление сохраненных планов"
                        description="Вы уверены, что хотите удалить все сохраненные планы?"
                        onConfirm={handleDeleteSavedPlans}
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
                        onClick={handleSaveCalculatedPlans}
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
                  columns={columns}
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
                    return (
                      <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                        <Table.Summary.Cell index={6}>
                          <Tag color="blue">
                            {savedPlansCount} сохранено
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
      </Spin>
    </div>
  );
};

export default ProductionPlanPage;