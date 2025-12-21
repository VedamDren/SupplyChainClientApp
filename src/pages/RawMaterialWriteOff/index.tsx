import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  message,
  Space,
  Typography,
  Alert,
  Divider,
  Statistic,
  Tag,
  Modal,
  Table,
  Descriptions,
  Row,
  Col,
  Tabs,
  Spin,
  Progress,
  Tooltip,
  Badge,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  CalculatorOutlined, 
  SaveOutlined, 
  HistoryOutlined,
  ReloadOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  CalendarOutlined,
  FilterOutlined,
  WarningOutlined,
  ShopOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import RawMaterialWriteOffService, {
  YearlyCalculationRequest,
  YearlyCalculationResult,
  MonthlyCalculationResult,
  RawMaterialWriteOff,
  APIResponse,
} from '@/services/rawMaterialWriteOffService';
import { SubdivisionDto, SubdivisionType, SubdivisionTypeLabels } from '@/models/subdivision';
import { MaterialDto, MaterialType, MaterialTypeLabels } from '@/models/material';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;
const { useForm } = Form;
const { Option } = Select;

/**
 * Страница расчета годового плана списания сырья
 */
const RawMaterialWriteOffCalculationPage: React.FC = () => {
  const [form] = useForm();
  const [filterForm] = useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [calculationResult, setCalculationResult] = useState<YearlyCalculationResult | null>(null);
  const [calculatedWriteOffs, setCalculatedWriteOffs] = useState<RawMaterialWriteOff[]>([]);
  const [subdivisions, setSubdivisions] = useState<SubdivisionDto[]>([]);
  const [rawMaterials, setRawMaterials] = useState<MaterialDto[]>([]);
  const [activeTab, setActiveTab] = useState<string>('calculation');
  const [selectedMonthDetails, setSelectedMonthDetails] = useState<MonthlyCalculationResult | null>(null);
  const [monthDetailsModalVisible, setMonthDetailsModalVisible] = useState<boolean>(false);
  const [apiEndpoints, setApiEndpoints] = useState<{
    subdivisions: string | null;
    materials: string | null;
  }>({
    subdivisions: null,
    materials: null
  });

  // Загрузка начальных данных
  useEffect(() => {
    loadInitialData();
    loadCalculatedWriteOffs();
  }, []);

  // Загрузка подразделений и материалов
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Загружаем подразделения
      const subdivisionsResponse = await loadSubdivisions();
      if (subdivisionsResponse.success) {
        setSubdivisions(subdivisionsResponse.data || []);
      } else {
        console.error('Ошибка загрузки подразделений:', subdivisionsResponse.error);
      }
      
      // Загружаем материалы
      const materialsResponse = await loadMaterials();
      if (materialsResponse.success) {
        setRawMaterials(materialsResponse.data || []);
      } else {
        console.error('Ошибка загрузки материалов:', materialsResponse.error);
      }
      
      // Устанавливаем текущий год по умолчанию
      const currentYear = RawMaterialWriteOffService.getCurrentYear();
      form.setFieldsValue({
        year: currentYear,
      });
      
      // Устанавливаем текущий год в фильтр по умолчанию
      filterForm.setFieldsValue({
        filterYear: currentYear,
      });
      
    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error);
      message.error('Ошибка при загрузке данных: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  // Загрузка подразделений
  const loadSubdivisions = async (): Promise<APIResponse<SubdivisionDto[]>> => {
    try {
      console.log('Загружаем подразделения...');
      const subdivisions = await RawMaterialWriteOffService.getSubdivisions();
      
      // Фильтруем только производственные подразделения
      const productionSubdivisions = subdivisions.filter((sub: SubdivisionDto) => {
        const typeStr = String(sub.type).toLowerCase();
        return typeStr.includes('production') || typeStr === SubdivisionType.Production.toLowerCase();
      });

      console.log(`Получено ${productionSubdivisions.length} производственных подразделений`);
      
      // Нормализуем тип
      const normalizedSubdivisions = productionSubdivisions.map(sub => 
        RawMaterialWriteOffService.normalizeSubdivisionType(sub)
      );

      setApiEndpoints(prev => ({ ...prev, subdivisions: '/api/Subdivisions' }));
      
      return { 
        success: true, 
        data: normalizedSubdivisions 
      };
      
    } catch (error: any) {
      console.error('Ошибка загрузки подразделений:', error);
      
      let errorMsg = 'Произошла ошибка при загрузке подразделений';
      if (error.response?.status) {
        errorMsg = `Ошибка ${error.response.status}: ${error.response.statusText}`;
      } else if (error.message) {
        errorMsg = `Ошибка: ${error.message}`;
      }
      
      return { 
        success: false, 
        error: errorMsg 
      };
    }
  };

  // Загрузка материалов
  const loadMaterials = async (): Promise<APIResponse<MaterialDto[]>> => {
    try {
      console.log('Загружаем материалы...');
      const materials = await RawMaterialWriteOffService.getMaterials();
      
      // Фильтруем только сырьевые материалы
      const rawMaterialItems = materials.filter((material: MaterialDto) => {
        const typeStr = String(material.type).toLowerCase();
        return typeStr.includes('raw') || typeStr === MaterialType.RawMaterial.toLowerCase();
      });

      console.log(`Найдено ${rawMaterialItems.length} сырьевых материалов`);
      
      // Нормализуем тип
      const normalizedMaterials = rawMaterialItems.map(mat => 
        RawMaterialWriteOffService.normalizeMaterialType(mat)
      );

      setApiEndpoints(prev => ({ ...prev, materials: '/api/Materials' }));
      
      return { 
        success: true, 
        data: normalizedMaterials 
      };
      
    } catch (error: any) {
      console.error('Ошибка загрузки материалов:', error);
      
      let errorMsg = 'Произошла ошибка при загрузке материалов';
      if (error.response?.status) {
        errorMsg = `Ошибка ${error.response.status}: ${error.response.statusText}`;
      } else if (error.message) {
        errorMsg = `Ошибка: ${error.message}`;
      }
      
      return { 
        success: false, 
        error: errorMsg 
      };
    }
  };

  // Загрузка расчетных списаний с фильтрами
  const loadCalculatedWriteOffs = async (filters?: {
    year?: number;
    subdivisionId?: number;
    rawMaterialId?: number;
  }) => {
    try {
      setFilterLoading(true);
      const response = await RawMaterialWriteOffService.getCalculatedWriteOffsByFilter(
        filters?.year,
        filters?.subdivisionId,
        filters?.rawMaterialId
      );
      
      if (response.success && response.data) {
        // Сортируем по дате списания в порядке возрастания (январь -> декабрь)
        const sortedWriteOffs = [...(response.data || [])].sort((a, b) => {
          const dateA = a.writeOffDate ? new Date(a.writeOffDate).getTime() : 0;
          const dateB = b.writeOffDate ? new Date(b.writeOffDate).getTime() : 0;
          return dateA - dateB; // Возрастающий порядок
        });
        
        setCalculatedWriteOffs(sortedWriteOffs);
      } else {
        console.log('Нет данных для указанных фильтров:', response.error);
        setCalculatedWriteOffs([]);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки истории:', error);
      setCalculatedWriteOffs([]);
    } finally {
      setFilterLoading(false);
    }
  };

  // Применение фильтров
  const handleApplyFilter = async () => {
    try {
      const values = await filterForm.validateFields();
      await loadCalculatedWriteOffs({
        year: values.filterYear,
        subdivisionId: values.filterSubdivisionId,
        rawMaterialId: values.filterRawMaterialId,
      });
      message.success('Фильтры применены');
    } catch (error: any) {
      console.error('Ошибка применения фильтров:', error);
    }
  };

  // Сброс фильтров
  const handleResetFilter = () => {
    filterForm.resetFields();
    const currentYear = RawMaterialWriteOffService.getCurrentYear();
    filterForm.setFieldsValue({
      filterYear: currentYear,
    });
    loadCalculatedWriteOffs();
  };

  // Обработка расчета годового плана
  const handleCalculate = async () => {
    try {
      const values = await form.validateFields();
      
      // Проверяем, что все обязательные поля заполнены
      if (!values.subdivisionId || !values.rawMaterialId || !values.year) {
        message.error('Заполните все обязательные поля');
        return;
      }
      
      const request: YearlyCalculationRequest = {
        year: values.year,
        subdivisionId: values.subdivisionId,
        rawMaterialId: values.rawMaterialId,
      };

      // Валидация на клиенте
      const validationError = RawMaterialWriteOffService.validateCalculationData(request);
      if (validationError) {
        message.error(validationError);
        return;
      }

      setCalculating(true);
      const response = await RawMaterialWriteOffService.calculateYearly(request);
      
      if (response.success && response.data) {
        // Обогащаем данные названиями подразделения и материала
        const selectedSub = subdivisions.find(s => s.id === request.subdivisionId);
        const selectedMat = rawMaterials.find(m => m.id === request.rawMaterialId);
        
        const enrichedResult = {
          ...response.data,
          subdivisionName: selectedSub?.name || response.data.subdivisionName || 'Неизвестно',
          rawMaterialName: selectedMat?.name || response.data.rawMaterialName || 'Неизвестно'
        };
        
        setCalculationResult(enrichedResult);
        message.success(`Годовой план списания рассчитан! Всего: ${RawMaterialWriteOffService.formatNumber(enrichedResult.totalQuantity)} ед.`);
      } else {
        message.error(response.error || 'Ошибка при расчете годового плана');
      }
    } catch (error: any) {
      console.error('Ошибка расчета:', error);
      if (error.errorFields) {
        message.error('Пожалуйста, заполните все обязательные поля');
      } else {
        message.error(error.message || 'Ошибка при расчете годового плана');
      }
    } finally {
      setCalculating(false);
    }
  };

  // Обработка расчета и сохранения годового плана
  const handleCalculateAndSave = async () => {
    try {
      const values = await form.validateFields();
      
      // Проверяем, что все обязательные поля заполнены
      if (!values.subdivisionId || !values.rawMaterialId || !values.year) {
        message.error('Заполните все обязательные поля');
        return;
      }
      
      const request: YearlyCalculationRequest = {
        year: values.year,
        subdivisionId: values.subdivisionId,
        rawMaterialId: values.rawMaterialId,
      };

      // Валидация на клиенте
      const validationError = RawMaterialWriteOffService.validateCalculationData(request);
      if (validationError) {
        message.error(validationError);
        return;
      }

      setSaving(true);
      const response = await RawMaterialWriteOffService.calculateAndSaveYearly(request);
      
      if (response.success) {
        // Обновляем историю расчетов с фильтрами по текущим параметрам
        await loadCalculatedWriteOffs({
          year: request.year,
          subdivisionId: request.subdivisionId,
          rawMaterialId: request.rawMaterialId,
        });
        
        // Показываем сообщение об успехе
        const savedData = response.data || [];
        const totalSaved = savedData.reduce((sum, item) => sum + (item.quantity || 0), 0);
        message.success(
          `Годовой план сохранен! Создано ${savedData.length} записей. ` +
          `Общее количество: ${RawMaterialWriteOffService.formatNumber(totalSaved)} ед.`
        );
        
        // Сбрасываем результат расчета
        setCalculationResult(null);
        
        // Переключаемся на вкладку истории
        setActiveTab('history');
      } else {
        message.error(response.error || 'Ошибка при сохранении годового плана');
      }
    } catch (error: any) {
      console.error('Ошибка сохранения:', error);
      message.error(error.message || 'Ошибка при сохранении годового плана');
    } finally {
      setSaving(false);
    }
  };

  // Показать детали по конкретному месяцу
  const showMonthDetails = (monthResult: MonthlyCalculationResult) => {
    setSelectedMonthDetails(monthResult);
    setMonthDetailsModalVisible(true);
  };

  // Удаление расчетного списания
  const handleDeleteWriteOff = async (id: number) => {
    confirm({
      title: 'Удалить расчетное списание?',
      content: 'Вы уверены, что хотите удалить это расчетное списание?',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          const response = await RawMaterialWriteOffService.deleteWriteOff(id);
          if (response.success) {
            message.success('Списание удалено');
            // Перезагружаем данные с текущими фильтрами
            const filterValues = filterForm.getFieldsValue();
            await loadCalculatedWriteOffs({
              year: filterValues.filterYear,
              subdivisionId: filterValues.filterSubdivisionId,
              rawMaterialId: filterValues.filterRawMaterialId,
            });
          } else {
            message.error(response.error || 'Ошибка при удалении списания');
          }
        } catch (error: any) {
          console.error('Ошибка удаления:', error);
          message.error('Ошибка при удалении списания');
        }
      },
    });
  };

  // Сброс формы расчета
  const handleReset = () => {
    form.resetFields();
    setCalculationResult(null);
    setSelectedMonthDetails(null);
    
    // Устанавливаем текущий год по умолчанию
    form.setFieldsValue({
      year: RawMaterialWriteOffService.getCurrentYear(),
    });
  };

  // Обновление справочников
  const handleRefreshData = async () => {
    await loadInitialData();
    message.success('Справочники обновлены');
  };

  // Колонки для таблицы месячных результатов (унифицированный стиль как в истории)
  const monthlyResultsColumns: ColumnsType<MonthlyCalculationResult> = [
    {
      title: 'Месяц',
      dataIndex: 'month',
      key: 'month',
      width: 150,
      defaultSortOrder: 'ascend', // Сортировка по возрастанию месяцев
      sorter: (a, b) => a.month - b.month,
      render: (month: number, record: MonthlyCalculationResult) => {
        // Формируем дату для отображения (первое число месяца выбранного года)
        const year = calculationResult?.year || new Date().getFullYear();
        const monthDate = new Date(year, month - 1, 1);
        const formattedDate = monthDate.toLocaleDateString('ru-RU', { 
          month: 'long', 
          year: 'numeric' 
        });
        
        return (
          <div>
            <div style={{ fontWeight: 500, fontSize: '14px' }}>
              <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              {formattedDate}
            </div>
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 24 }}>
              {record.monthName || RawMaterialWriteOffService.getMonthName(month)}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Количество',
      dataIndex: 'calculatedQuantity',
      key: 'calculatedQuantity',
      width: 180,
      sorter: (a, b) => (a.calculatedQuantity || 0) - (b.calculatedQuantity || 0),
      render: (quantity: number, record: MonthlyCalculationResult) => (
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: quantity > 0 ? '#5dff8d15' : '#fafafa',
          border: `1px solid ${quantity > 0 ? '#23ffc8ff' : '#d9d9d9'}`,
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <Text strong style={{ 
            fontSize: '16px', 
            color: quantity > 0 ? '#108d00ff' : '#8c8c8c',
            display: 'block'
          }}>
            {quantity > 0 ? RawMaterialWriteOffService.formatNumber(quantity) : '0'} ед.
          </Text>
          {record.productionPlansCount > 0 && (
            <Text type="secondary" style={{ fontSize: '12px', marginTop: 4 }}>
              на основе {record.productionPlansCount} планов
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Тип',
      key: 'type',
      width: 120,
      render: (_: any, record: MonthlyCalculationResult) => (
        <Tag 
          color="blue"
          style={{ fontWeight: 500, fontSize: '12px' }}
        >
          Расчетное
        </Tag>
      ),
    },
    {
      title: 'Детали',
      key: 'actions',
      width: 100,
      render: (_: any, record: MonthlyCalculationResult) => (
        <Button
          type="link"
          size="small"
          onClick={() => showMonthDetails(record)}
          disabled={record.calculatedQuantity === 0}
          icon={<InfoCircleOutlined />}
        >
          Подробнее
        </Button>
      ),
    },
  ];

  // Колонки для таблицы расчетных списаний (с сортировкой по возрастанию даты)
  const calculatedWriteOffsColumns: ColumnsType<RawMaterialWriteOff> = [
    {
      title: 'Дата списания',
      dataIndex: 'writeOffDate',
      key: 'writeOffDate',
      width: 150,
      defaultSortOrder: 'ascend', // Важное изменение: сортировка по возрастанию (январь -> декабрь)
      sorter: (a, b) => {
        const dateA = a.writeOffDate ? new Date(a.writeOffDate).getTime() : 0;
        const dateB = b.writeOffDate ? new Date(b.writeOffDate).getTime() : 0;
        return dateA - dateB; // Изменено на возрастающий порядок
      },
      render: (text: string) => {
        if (!text) return '-';
        try {
          const date = new Date(text);
          return (
            <div>
              <div style={{ fontWeight: 500, fontSize: '14px' }}>
                <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {RawMaterialWriteOffService.formatDate(text)}
              </div>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 24 }}>
                {RawMaterialWriteOffService.getMonthName(date.getMonth() + 1)}
              </Text>
            </div>
          );
        } catch (error) {
          return text;
        }
      },
    },
    {
      title: 'Подразделение',
      dataIndex: 'subdivisionName',
      key: 'subdivisionName',
      width: 180,
      render: (text: string) => (
        <Text strong>{text}</Text>
      ),
    },
    {
      title: 'Сырье',
      dataIndex: 'rawMaterialName',
      key: 'rawMaterialName',
      width: 180,
      render: (text: string) => (
        <Text strong>{text}</Text>
      ),
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 150,
      sorter: (a, b) => (a.quantity || 0) - (b.quantity || 0),
      render: (quantity: number) => (
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <Text strong style={{ 
            fontSize: '16px', 
            color: '#1890ff',
            display: 'block'
          }}>
            {RawMaterialWriteOffService.formatNumber(quantity)} ед.
          </Text>
        </div>
      ),
    },
    {
      title: 'Тип',
      key: 'isCalculated',
      width: 120,
      render: (_: any, record: RawMaterialWriteOff) => (
        <Tag 
          color={record.isCalculated ? 'blue' : 'green'}
          style={{ fontWeight: 500, fontSize: '12px' }}
        >
          {record.isCalculated ? 'Расчетное' : 'Фактическое'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 80,
      render: (_: any, record: RawMaterialWriteOff) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteWriteOff(record.id)}
          size="small"
          title="Удалить"
        />
      ),
    },
  ];

  // Компонент для вкладки расчета
  const CalculationTab = () => (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Форма параметров расчета */}
      <Card
        title={
          <Space>
            <CalculatorOutlined />
            <span>Параметры годового расчета</span>
          </Space>
        }
        bordered
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefreshData}
              loading={loading}
            >
              Обновить справочники
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              Сбросить
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item
                name="subdivisionId"
                label={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ShopOutlined style={{ marginRight: 8 }} />
                    <span>Производственное подразделение</span>
                  </div>
                }
                rules={[{ required: true, message: 'Выберите производственное подразделение' }]}
                tooltip="Выбор доступен только из производственных подразделений"
                help={subdivisions.length === 0 ? (
                  <Text type="warning" style={{ fontSize: '12px' }}>
                    <WarningOutlined /> Не загружены производственные подразделения
                  </Text>
                ) : null}
              >
                <Select
                  placeholder="Выберите производственное подразделение"
                  loading={loading}
                  showSearch
                  filterOption={(input, option: any) => {
                    const optionText = option?.children?.props?.children || '';
                    return optionText.toLowerCase().includes(input.toLowerCase());
                  }}
                  allowClear
                  notFoundContent={
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      description="Не найдено производственных подразделений"
                    />
                  }
                  dropdownStyle={{ minWidth: 300 }}
                  style={{ width: '100%' }}
                  size="large"
                >
                  {subdivisions.map(sub => (
                    <Option key={sub.id} value={sub.id}>
                      <div style={{ padding: '4px 0' }}>
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>
                          {sub.name}
                        </div>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item
                name="rawMaterialId"
                label={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <AppstoreOutlined style={{ marginRight: 8 }} />
                    <span>Сырье</span>
                  </div>
                }
                rules={[{ required: true, message: 'Выберите сырье' }]}
                tooltip="Выбор доступен только из сырьевых материалов"
                help={rawMaterials.length === 0 ? (
                  <Text type="warning" style={{ fontSize: '12px' }}>
                    <WarningOutlined /> Не загружено сырье
                  </Text>
                ) : null}
              >
                <Select
                  placeholder="Выберите сырье"
                  loading={loading}
                  showSearch
                  filterOption={(input, option: any) => {
                    const optionText = option?.children?.props?.children || '';
                    return optionText.toLowerCase().includes(input.toLowerCase());
                  }}
                  allowClear
                  notFoundContent={
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      description="Не найдено сырьевых материалов"
                    />
                  }
                  dropdownStyle={{ minWidth: 300 }}
                  style={{ width: '100%' }}
                  size="large"
                >
                  {rawMaterials.map(mat => (
                    <Option key={mat.id} value={mat.id}>
                      <div style={{ padding: '4px 0' }}>
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>
                          {mat.name}
                        </div>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={8}>
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
                <Select
                  placeholder="Выберите год"
                  options={RawMaterialWriteOffService.getYears()}
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
          
          {(subdivisions.length === 0 || rawMaterials.length === 0) && (
            <Alert
              message="Внимание"
              description={
                <div>
                  <p>Не удалось загрузить один или несколько справочников:</p>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {subdivisions.length === 0 && (
                      <li>
                        <strong>Производственные подразделения:</strong> использует endpoint: {apiEndpoints.subdivisions || '/api/Subdivisions'}
                      </li>
                    )}
                    {rawMaterials.length === 0 && (
                      <li>
                        <strong>Сырьевые материалы:</strong> использует endpoint: {apiEndpoints.materials || '/api/Materials'}
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
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Divider />
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                loading={calculating}
                onClick={handleCalculate}
                size="large"
                style={{ minWidth: 200, height: 48 }}
                disabled={subdivisions.length === 0 || rawMaterials.length === 0}
              >
                <span style={{ fontSize: '16px' }}>Рассчитать годовой план</span>
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleCalculateAndSave}
                size="large"
                ghost
                style={{ minWidth: 200, height: 48 }}
                disabled={subdivisions.length === 0 || rawMaterials.length === 0}
              >
                <span style={{ fontSize: '16px' }}>Рассчитать и сохранить</span>
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Результаты расчета */}
      {calculationResult && (
        <>
          {/* Таблица по месяцам */}
          {calculationResult.monthlyResults && calculationResult.monthlyResults.length > 0 && (
            <Card
              title={
                <Space>
                  <CalendarOutlined />
                  <span>Результаты по месяцам</span>
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {calculationResult.monthlyResults.filter(m => m.calculatedQuantity > 0).length} месяцев с данными
                  </Tag>
                </Space>
              }
              bordered
              style={{ marginBottom: 24 }}
            >
              <Table<MonthlyCalculationResult>
                dataSource={calculationResult.monthlyResults}
                columns={monthlyResultsColumns}
                rowKey="month"
                pagination={false}
                size="middle"
                locale={{
                  emptyText: 'Нет данных по месяцам'
                }}

              />
            </Card>
          )}
        </>
      )}
      
      {/* Модальное окно с деталями месяца */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined />
            <span>
              Детали расчета: {selectedMonthDetails ? (selectedMonthDetails.monthName || RawMaterialWriteOffService.getMonthName(selectedMonthDetails.month)) : ''}
            </span>
          </Space>
        }
        open={monthDetailsModalVisible}
        onCancel={() => setMonthDetailsModalVisible(false)}
        width={600}
        footer={[
          <Button key="close" onClick={() => setMonthDetailsModalVisible(false)}>
            Закрыть
          </Button>
        ]}
      >
        {selectedMonthDetails && (
          <div>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Месяц" labelStyle={{ fontWeight: 600, width: '40%' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  {selectedMonthDetails.monthName || RawMaterialWriteOffService.getMonthName(selectedMonthDetails.month)} {selectedMonthDetails.year}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Рассчитанное количество" labelStyle={{ fontWeight: 600 }}>
                <div style={{ 
                  padding: '4px 8px', 
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                    {selectedMonthDetails.calculatedQuantity || 0} ед.
                  </Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Количество планов производства" labelStyle={{ fontWeight: 600 }}>
                <Tag color="blue" style={{ fontSize: '12px', fontWeight: 500 }}>
                  {selectedMonthDetails.productionPlansCount || 0} планов
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            {selectedMonthDetails.calculationFormula && (
              <>
                <Divider orientation="left" style={{ marginTop: 24 }}>
                  <Text strong>Формула расчета</Text>
                </Divider>
                <Alert
                  message={selectedMonthDetails.calculationFormula}
                  type="info"
                  style={{ marginBottom: 16, fontSize: '13px' }}
                />
              </>
            )}
            
            {selectedMonthDetails.note && (
              <>
                <Divider orientation="left" style={{ marginTop: 24 }}>
                  <Text strong>Примечание</Text>
                </Divider>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#fafafa', 
                  borderRadius: '4px',
                  fontSize: '13px'
                }}>
                  {selectedMonthDetails.note}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );

  // Компонент для вкладки истории
  const HistoryTab = () => (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>История расчетных списаний</span>
            {calculatedWriteOffs.length > 0 && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {calculatedWriteOffs.length} записей
              </Tag>
            )}
          </Space>
        }
        bordered
        style={{ marginBottom: 24 }}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadCalculatedWriteOffs()}
            loading={filterLoading}
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
              <span>Фильтры</span>
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
                >
                  <Select
                    placeholder="Выберите год"
                    allowClear
                    options={RawMaterialWriteOffService.getYears()}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="filterSubdivisionId"
                  label="Подразделение"
                >
                  <Select
                    placeholder="Выберите подразделение"
                    allowClear
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
                  name="filterRawMaterialId"
                  label="Сырье"
                >
                  <Select
                    placeholder="Выберите сырье"
                    allowClear
                    showSearch
                    options={rawMaterials.map(m => ({
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
                  onClick={handleApplyFilter}
                  loading={filterLoading}
                >
                  Применить фильтры
                </Button>
                <Button
                  onClick={handleResetFilter}
                >
                  Сбросить фильтры
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Таблица с данными */}
        <Table<RawMaterialWriteOff>
          columns={calculatedWriteOffsColumns}
          dataSource={calculatedWriteOffs}
          rowKey="id"
          loading={filterLoading}
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
                description="Нет расчетных списаний"
              />
            ),
          }}
          summary={() => {
            const totalQuantity = calculatedWriteOffs.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const calculatedCount = calculatedWriteOffs.filter(item => item.isCalculated).length;
            
            return calculatedWriteOffs.length > 0 ? (
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={3}>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {calculatedCount} расчетных
                    </Text>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} />
              </Table.Summary.Row>
            ) : null;
          }}
        />
      </Card>
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Заголовок страницы */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <CalculatorOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          Расчет годового плана списания сырья
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          Расчет выполняется на год по формуле: сумма планов производства всех материалов за каждый месяц
        </Text>
      </div>

      {/* Переключение вкладок */}
      <div style={{ marginBottom: '24px' }}>
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
                Рассчитанные планы списания
              </span>
            }
            key="history"
          />
        </Tabs>
      </div>

      {/* Контент страницы */}
      <Spin spinning={loading} tip="Загрузка данных...">
        {activeTab === 'calculation' ? <CalculationTab /> : <HistoryTab />}
      </Spin>
    </div>
  );
};

export default RawMaterialWriteOffCalculationPage;