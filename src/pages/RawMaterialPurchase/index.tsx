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
  Table,
  Descriptions,
  Row,
  Col,
  Tabs,
  Spin,
  Tag,
  Modal,
  Empty,
  Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  CalculatorOutlined, 
  SaveOutlined, 
  HistoryOutlined,
  ReloadOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  FilterOutlined,
  WarningOutlined,
  ShopOutlined,
  AppstoreOutlined,
  SyncOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import RawMaterialPurchasePlanService, {
  RawMaterialPurchasePlanRequest,
  YearlyPurchasePlanResult,
  MonthlyPurchasePlanResult,
  RawMaterialPurchaseDto,
  APIResponse,
} from '@/services/rawMaterialPurchaseService';
import { SubdivisionDto } from '@/models/subdivision';
import { MaterialDto } from '@/models/material';
import request from 'umi-request';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;
const { useForm } = Form;
const { Option } = Select;

/**
 * Страница расчета годового плана закупа сырья
 */
const RawMaterialPurchasePlanPage: React.FC = () => {
  const [form] = useForm();
  const [filterForm] = useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [calculationResult, setCalculationResult] = useState<YearlyPurchasePlanResult | null>(null);
  const [savedPurchasePlans, setSavedPurchasePlans] = useState<RawMaterialPurchaseDto[]>([]);
  const [subdivisions, setSubdivisions] = useState<SubdivisionDto[]>([]);
  const [rawMaterials, setRawMaterials] = useState<MaterialDto[]>([]);
  const [activeTab, setActiveTab] = useState<string>('calculation');
  const [selectedMonthDetails, setSelectedMonthDetails] = useState<MonthlyPurchasePlanResult | null>(null);
  const [monthDetailsModalVisible, setMonthDetailsModalVisible] = useState<boolean>(false);

  // Загрузка начальных данных
  useEffect(() => {
    loadInitialData();
    // Загружаем историю при первой загрузке с текущим годом
    loadSavedPurchasePlans({ year: RawMaterialPurchasePlanService.getCurrentYear() });
  }, []);

  // Загрузка справочных данных
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Параллельная загрузка справочников
      const [subdivisionsData, materialsData] = await Promise.allSettled([
        RawMaterialPurchasePlanService.getProductionSubdivisions(),
        RawMaterialPurchasePlanService.getRawMaterials()
      ]);
      
      // Обработка подразделений
      if (subdivisionsData.status === 'fulfilled') {
        setSubdivisions(subdivisionsData.value);
      } else {
        console.error('Ошибка загрузки подразделений:', subdivisionsData.reason);
        message.warning('Не удалось загрузить производственные подразделения');
      }
      
      // Обработка материалов
      if (materialsData.status === 'fulfilled') {
        setRawMaterials(materialsData.value);
      } else {
        console.error('Ошибка загрузки материалов:', materialsData.reason);
        message.warning('Не удалось загрузить сырьевые материалы');
      }
      
      // Устанавливаем текущий год по умолчанию
      const currentYear = RawMaterialPurchasePlanService.getCurrentYear();
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

  // Загрузка сохраненных планов закупа
  const loadSavedPurchasePlans = async (filters?: {
    year?: number;
    subdivisionId?: number;
    rawMaterialId?: number;
  }) => {
    try {
      setFilterLoading(true);
      const response = await RawMaterialPurchasePlanService.getSavedPurchasePlans(
        filters?.year,
        filters?.subdivisionId,
        filters?.rawMaterialId
      );
      
      if (response.success) {
        setSavedPurchasePlans(response.data || []);
        if (response.data && response.data.length === 0) {
          message.info('Нет сохраненных планов закупа для указанных фильтров');
        }
      } else {
        console.error('Ошибка загрузки планов закупа:', response.error);
        setSavedPurchasePlans([]);
        if (response.error) {
          message.warning(response.error);
        }
      }
    } catch (error: any) {
      console.error('Ошибка загрузки сохраненных планов закупа:', error);
      setSavedPurchasePlans([]);
      message.error('Ошибка загрузки планов: ' + error.message);
    } finally {
      setFilterLoading(false);
    }
  };

  // Применение фильтров для истории
  const handleApplyFilter = async () => {
    try {
      const values = await filterForm.validateFields();
      await loadSavedPurchasePlans({
        year: values.filterYear,
        subdivisionId: values.filterSubdivisionId,
        rawMaterialId: values.filterRawMaterialId,
      });
    } catch (error: any) {
      console.error('Ошибка применения фильтров:', error);
      message.error('Ошибка применения фильтров');
    }
  };

  // Сброс фильтров для истории
  const handleResetFilter = () => {
    filterForm.resetFields();
    const currentYear = RawMaterialPurchasePlanService.getCurrentYear();
    filterForm.setFieldsValue({
      filterYear: currentYear,
    });
    loadSavedPurchasePlans({ year: currentYear });
  };

  // Расчет годового плана закупа
  const handleCalculate = async () => {
    try {
      const values = await form.validateFields();
      
      // Проверяем обязательные поля
      if (!values.subdivisionId || !values.rawMaterialId || !values.year) {
        message.error('Заполните все обязательные поля');
        return;
      }
      
      const request: RawMaterialPurchasePlanRequest = {
        subdivisionId: values.subdivisionId,
        rawMaterialId: values.rawMaterialId,
        year: values.year,
      };

      // Валидация на клиенте
      const validationError = RawMaterialPurchasePlanService.validateCalculationData(request);
      if (validationError) {
        message.error(validationError);
        return;
      }

      setCalculating(true);
      const response = await RawMaterialPurchasePlanService.calculateYearlyPlan(request);
      
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
        message.success(
          `Годовой план закупа рассчитан! Общее количество: ${RawMaterialPurchasePlanService.formatNumber(enrichedResult.totalQuantity)} ед.`
        );
      } else {
        message.error(response.error || 'Ошибка при расчете годового плана закупа');
      }
    } catch (error: any) {
      console.error('Ошибка расчета:', error);
      if (error.errorFields) {
        message.error('Пожалуйста, заполните все обязательные поля');
      } else {
        message.error(error.message || 'Ошибка при расчете годового плана закупа');
      }
    } finally {
      setCalculating(false);
    }
  };

  // Сохранение рассчитанного плана закупа
  const handleSavePlan = async () => {
    try {
      if (!calculationResult || calculationResult.monthlyResults.length === 0) {
        message.warning('Сначала выполните расчет');
        return;
      }

      // Подтверждение сохранения
      confirm({
        title: 'Сохранить план закупа?',
        content: 'Вы уверены, что хотите сохранить рассчитанный план закупа? Существующие записи будут обновлены.',
        okText: 'Сохранить',
        cancelText: 'Отмена',
        onOk: async () => {
          try {
            setSaving(true);
            
            // Подготавливаем данные для сохранения
            const plansToSave = calculationResult.monthlyResults.map(plan => ({
              ...plan,
              subdivisionId: calculationResult.subdivisionId,
              rawMaterialId: calculationResult.rawMaterialId
            }));
            
            const response = await RawMaterialPurchasePlanService.saveYearlyPlan(plansToSave);
            
            if (response.success) {
              // Обновляем историю закупок с фильтрами по текущим параметрам
              await loadSavedPurchasePlans({
                year: calculationResult.year,
                subdivisionId: calculationResult.subdivisionId,
                rawMaterialId: calculationResult.rawMaterialId,
              });
              
              message.success(
                <span>
                  План закупа сохранен! {response.data ? `Создано ${response.data.length} записей` : ''}
                </span>
              );
              
              // Сбрасываем результат расчета
              setCalculationResult(null);
              
              // Переключаемся на вкладку истории
              setActiveTab('history');
            } else {
              message.error(response.error || 'Ошибка при сохранении плана закупа');
            }
          } catch (error: any) {
            console.error('Ошибка сохранения:', error);
            message.error('Ошибка при сохранении: ' + error.message);
          } finally {
            setSaving(false);
          }
        }
      });
    } catch (error: any) {
      console.error('Ошибка подготовки сохранения:', error);
    }
  };

  // Перерасчет планов
  const handleRecalculatePlans = async () => {
    try {
      const values = await form.validateFields();
      
      if (!values.subdivisionId || !values.rawMaterialId || !values.year) {
        message.error('Заполните все обязательные поля для перерасчета');
        return;
      }
      
      const request: RawMaterialPurchasePlanRequest = {
        subdivisionId: values.subdivisionId,
        rawMaterialId: values.rawMaterialId,
        year: values.year,
      };

      confirm({
        title: 'Выполнить перерасчет?',
        content: 'Все существующие планы закупа за указанный год будут удалены и пересчитаны заново.',
        okText: 'Пересчитать',
        okType: 'danger',
        cancelText: 'Отмена',
        onOk: async () => {
          try {
            setRecalculating(true);
            const response = await RawMaterialPurchasePlanService.recalculatePlans(request);
            
            if (response.success && response.data) {
              // Обновляем результат расчета
              setCalculationResult(response.data);
              
              // Обновляем историю
              await loadSavedPurchasePlans({
                year: request.year,
                subdivisionId: request.subdivisionId,
                rawMaterialId: request.rawMaterialId,
              });
              
              message.success('Планы успешно пересчитаны');
            } else {
              message.error(response.error || 'Ошибка перерасчета');
            }
          } catch (error: any) {
            console.error('Ошибка перерасчета:', error);
            message.error('Ошибка перерасчета: ' + error.message);
          } finally {
            setRecalculating(false);
          }
        }
      });
    } catch (error: any) {
      console.error('Ошибка подготовки перерасчета:', error);
      message.error('Ошибка подготовки перерасчета');
    }
  };

  // Показать детали по конкретному месяцу
  const showMonthDetails = (monthResult: MonthlyPurchasePlanResult) => {
    setSelectedMonthDetails(monthResult);
    setMonthDetailsModalVisible(true);
  };

  // Удаление плана закупа
  const handleDeletePurchasePlan = async (id: number) => {
    confirm({
      title: 'Удалить план закупа?',
      content: 'Вы уверены, что хотите удалить этот план закупа? Это действие нельзя отменить.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          // Используем существующий API метод для удаления
          const response = await request(`/api/RawMaterialPurchases/${id}`, {
            method: 'DELETE',
          });

          if (response) {
            message.success('План закупа удален');
            // Перезагружаем данные с текущими фильтрами
            const filterValues = filterForm.getFieldsValue();
            await loadSavedPurchasePlans({
              year: filterValues.filterYear,
              subdivisionId: filterValues.filterSubdivisionId,
              rawMaterialId: filterValues.filterRawMaterialId,
            });
          }
        } catch (error: any) {
          console.error('Ошибка удаления:', error);
          message.error('Ошибка при удалении плана закупа');
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
      year: RawMaterialPurchasePlanService.getCurrentYear(),
    });
  };

  // Обновление справочников
  const handleRefreshData = async () => {
    setLoading(true);
    await loadInitialData();
    message.success('Справочники обновлены');
  };

  // Загрузка шаблона данных
  const handleLoadTemplate = () => {
    // Можно добавить функционал загрузки шаблона из Excel
    message.info('Функционал загрузки шаблона будет добавлен в следующей версии');
  };

  // Колонки для таблицы месячных результатов расчета
  const monthlyResultsColumns: ColumnsType<MonthlyPurchasePlanResult> = [
    {
      title: 'Месяц',
      dataIndex: 'month',
      key: 'month',
      width: 150,
      defaultSortOrder: 'ascend',
      sorter: (a, b) => a.month - b.month,
      render: (month: number, record: MonthlyPurchasePlanResult) => {
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
              {record.monthName || RawMaterialPurchasePlanService.getMonthName(month)}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Запасы на начало месяца',
      dataIndex: 'currentMonthInventory',
      key: 'currentMonthInventory',
      width: 120,
      align: 'right' as const,
      render: (value: number) => (
        <Text>{RawMaterialPurchasePlanService.formatNumber(value)}</Text>
      ),
    },
    {
      title: 'Запасы след. месяца',
      dataIndex: 'nextMonthInventory',
      key: 'nextMonthInventory',
      width: 120,
      align: 'right' as const,
      render: (value: number) => (
        <Text>{RawMaterialPurchasePlanService.formatNumber(value)}</Text>
      ),
    },
    {
      title: 'Планы производства',
      dataIndex: 'totalProductionPlans',
      key: 'totalProductionPlans',
      width: 120,
      align: 'right' as const,
      render: (value: number) => (
        <Text>{RawMaterialPurchasePlanService.formatNumber(value)}</Text>
      ),
    },
    {
      title: 'План закупа',
      dataIndex: 'purchasePlanQuantity',
      key: 'purchasePlanQuantity',
      width: 180,
      align: 'right' as const,
      sorter: (a, b) => (a.purchasePlanQuantity || 0) - (b.purchasePlanQuantity || 0),
      render: (quantity: number) => (
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: quantity > 0 ? '#f6ffed' : '#fafafa',
          border: `1px solid ${quantity > 0 ? '#b7eb8f' : '#d9d9d9'}`,
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <Text strong style={{ 
            fontSize: '16px', 
            color: quantity > 0 ? '#52c41a' : '#8c8c8c'
          }}>
            {RawMaterialPurchasePlanService.formatNumber(quantity)} ед.
          </Text>
        </div>
      ),
    },
    {
      title: 'Детали',
      key: 'actions',
      width: 100,
      render: (_: any, record: MonthlyPurchasePlanResult) => (
        <Button
          type="link"
          size="small"
          onClick={() => showMonthDetails(record)}
          icon={<InfoCircleOutlined />}
        >
          Подробнее
        </Button>
      ),
    },
  ];

  // Колонки для таблицы сохраненных планов закупа
  const savedPurchasePlansColumns: ColumnsType<RawMaterialPurchaseDto> = [
    {
      title: 'Дата закупа',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 150,
      defaultSortOrder: 'ascend',
      sorter: (a, b) => {
        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        return dateA - dateB;
      },
      render: (text: string) => {
        if (!text) return '-';
        try {
          const date = new Date(text);
          return (
            <div>
              <div style={{ fontWeight: 500, fontSize: '14px' }}>
                <CalendarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                {date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </div>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 24 }}>
                {RawMaterialPurchasePlanService.getMonthName(date.getMonth() + 1)}
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
      align: 'right' as const,
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
            color: '#1890ff'
          }}>
            {RawMaterialPurchasePlanService.formatNumber(quantity)} ед.
          </Text>
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 80,
      render: (_: any, record: RawMaterialPurchaseDto) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeletePurchasePlan(record.id)}
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
            <span>Параметры годового расчета плана закупа сырья</span>
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
              icon={<CloudDownloadOutlined />}
              onClick={handleLoadTemplate}
            >
              Шаблон
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
                    <span style={{ color: 'red', marginLeft: 4 }}>*</span>
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
                  placeholder="Выберите производственное подразделение"
                  loading={loading}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    if (option && option.children) {
                      return String(option.children).toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  }}
                  allowClear
                  notFoundContent={
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      description="Не найдено производственных подразделений"
                    />
                  }
                  style={{ width: '100%' }}
                  size="large"
                >
                  {subdivisions.map(sub => (
                    <Option key={sub.id} value={sub.id}>
                      {/* Упрощенное отображение - только название подразделения */}
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
                    <span style={{ color: 'red', marginLeft: 4 }}>*</span>
                  </div>
                }
                rules={[{ required: true, message: 'Выберите сырье' }]}
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
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    if (option && option.children) {
                      return String(option.children).toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  }}
                  allowClear
                  notFoundContent={
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      description="Не найдено сырьевых материалов"
                    />
                  }
                  style={{ width: '100%' }}
                  size="large"
                >
                  {rawMaterials.map(mat => (
                    <Option key={mat.id} value={mat.id}>
                      {/* Упрощенное отображение - только название материала */}
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
                    <span style={{ color: 'red', marginLeft: 4 }}>*</span>
                  </div>
                }
                rules={[{ required: true, message: 'Выберите год' }]}
              >
                <Select
                  placeholder="Выберите год"
                  options={RawMaterialPurchasePlanService.getYears()}
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
                        <strong>Производственные подразделения</strong>
                      </li>
                    )}
                    {rawMaterials.length === 0 && (
                      <li>
                        <strong>Сырьевые материалы</strong>
                      </li>
                    )}
                  </ul>
                  <p style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Нажмите "Обновить справочники" или проверьте консоль браузера
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
          
          {/* Информация о формуле расчета */}
          <Alert
            message="Формула расчета плана закупа сырья"
            description={
              <div>
                <Paragraph strong style={{ marginBottom: 4 }}>
                  План закупа = Запасы на начало следующего месяца - Запасы на начало текущего месяца + Сумма планов производства за текущий месяц
                </Paragraph>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Расчитывается автоматически на основе планов запасов и производственных планов из базы данных
                </Text>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
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
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Результаты расчета */}
      {calculationResult && (
        <>
          {/* Сводная информация */}
          <Card
            title="Сводная информация по расчету"
            bordered
            style={{ marginBottom: 24 }}
            extra={
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSavePlan}
                size="large"
                style={{ minWidth: 150 }}
              >
                Сохранить план
              </Button>
            }
          >
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small" title="Подразделение">
                  <Statistic
                    value={calculationResult.subdivisionName}
                    valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="Сырье">
                  <Statistic
                    value={calculationResult.rawMaterialName}
                    valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="Год">
                  <Statistic
                    value={calculationResult.year}
                    valueStyle={{ fontSize: '24px', color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="Общее количество за год">
                  <Statistic
                    value={calculationResult.totalQuantity}
                    suffix="ед."
                    valueStyle={{ fontSize: '24px', color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>

          {/* Таблица по месяцам */}
          {calculationResult.monthlyResults && calculationResult.monthlyResults.length > 0 && (
            <Card
              title={
                <Space>
                  <CalendarOutlined />
                  <span>Результаты расчета по месяцам</span>
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {calculationResult.monthlyResults.filter(m => m.purchasePlanQuantity > 0).length} месяцев с данными
                  </Tag>
                </Space>
              }
              bordered
              style={{ marginBottom: 24 }}
            >
              <Table<MonthlyPurchasePlanResult>
                dataSource={calculationResult.monthlyResults}
                columns={monthlyResultsColumns}
                rowKey="month"
                pagination={false}
                size="middle"
                scroll={{ x: 'max-content' }}

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
              Детали расчета: {selectedMonthDetails ? (selectedMonthDetails.monthName || RawMaterialPurchasePlanService.getMonthName(selectedMonthDetails.month)) : ''}
            </span>
          </Space>
        }
        open={monthDetailsModalVisible}
        onCancel={() => setMonthDetailsModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setMonthDetailsModalVisible(false)}>
            Закрыть
          </Button>
        ]}
      >
        {selectedMonthDetails && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Месяц" span={2} labelStyle={{ fontWeight: 600, width: '30%' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  {selectedMonthDetails.monthName || RawMaterialPurchasePlanService.getMonthName(selectedMonthDetails.month)} {selectedMonthDetails.year}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Запасы на начало месяца" labelStyle={{ fontWeight: 600 }}>
                <Statistic
                  value={selectedMonthDetails.currentMonthInventory}
                  suffix="ед."
                  valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Запасы на начало след. месяца" labelStyle={{ fontWeight: 600 }}>
                <Statistic
                  value={selectedMonthDetails.nextMonthInventory}
                  suffix="ед."
                  valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Сумма планов производства" labelStyle={{ fontWeight: 600 }}>
                <Statistic
                  value={selectedMonthDetails.totalProductionPlans}
                  suffix="ед."
                  valueStyle={{ fontSize: '16px', color: '#722ed1' }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="План закупа" labelStyle={{ fontWeight: 600 }}>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '4px'
                }}>
                  <Statistic
                    value={selectedMonthDetails.purchasePlanQuantity}
                    suffix="ед."
                    valueStyle={{ fontSize: '20px', color: '#52c41a' }}
                  />
                </div>
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
                  fontSize: '13px',
                  whiteSpace: 'pre-wrap'
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
            <span>Рассчитанные планы закупа сырья</span>
            {savedPurchasePlans.length > 0 && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {savedPurchasePlans.length} записей
              </Tag>
            )}
          </Space>
        }
        bordered
        style={{ marginBottom: 24 }}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadSavedPurchasePlans()}
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
                    options={RawMaterialPurchasePlanService.getYears()}
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
                    filterOption={(input, option) => {
                      if (option && option.label) {
                        return String(option.label).toLowerCase().includes(input.toLowerCase());
                      }
                      return false;
                    }}
                    options={subdivisions.map(s => ({
                      label: s.name, // Только название подразделения
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
                    filterOption={(input, option) => {
                      if (option && option.label) {
                        return String(option.label).toLowerCase().includes(input.toLowerCase());
                      }
                      return false;
                    }}
                    options={rawMaterials.map(m => ({
                      label: m.name, // Только название материала
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
        <Table<RawMaterialPurchaseDto>
          columns={savedPurchasePlansColumns}
          dataSource={savedPurchasePlans}
          rowKey="id"
          loading={filterLoading}
          scroll={{ x: 'max-content' }}
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
                description={
                  <div>
                    <p>Нет сохраненных планов закупа</p>
                    <Text type="secondary">
                      Попробуйте изменить фильтры или рассчитать новый план
                    </Text>
                  </div>
                }
              />
            ),
          }}
          summary={() => {
            const totalQuantity = savedPurchasePlans.reduce((sum, item) => sum + (item.quantity || 0), 0);
            
            return savedPurchasePlans.length > 0 ? (
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <div style={{ textAlign: 'right' }}>
                    <Text strong>Итого за период:</Text>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <div style={{ textAlign: 'center' }}>
                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                      {RawMaterialPurchasePlanService.formatNumber(totalQuantity)} ед.
                    </Text>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
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
          Расчет годового плана закупа сырья
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          Расчет выполняется на год по формуле: План закупа = Запасы след. месяца - Запасы тек. месяца + Сумма планов производства
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
                Рассчитанные планы закупа
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

export default RawMaterialPurchasePlanPage;