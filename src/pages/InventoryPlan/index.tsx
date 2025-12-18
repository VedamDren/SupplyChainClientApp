import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  message,
  Descriptions,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Typography,
  Spin,
  Alert,
  Modal,
  Input,
  Tooltip,
} from 'antd';
import {
  CalculatorOutlined,
  SaveOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  getInventoryPlans,
  calculateInventoryPlan,
  createInventoryPlan,
  deleteInventoryPlan,
  getSubdivisions,
  getMaterials,
} from '@/services/inventoryPlan';
import moment from 'moment';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { Title } = Typography;
const { Search } = Input;

// Интерфейсы для типизации данных
interface InventoryCalculationRequest {
  subdivisionId: number;
  materialId: number;
  date: string;
}

interface InventoryCalculationResult {
  date: string;
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

interface CalculationFormValues {
  subdivisionId: number;
  materialId: number;
  date: moment.Moment;
}

interface InventoryPlanResponse {
  id: number;
  subdivisionName: string;
  materialName: string;
  date: string;
  quantity: number;
}

interface Subdivision {
  id: number;
  name: string;
  type?: string;
}

interface Material {
  id: number;
  name: string;
  type?: string;
}

const InventoryPlanPage: React.FC = () => {
  const [form] = Form.useForm();
  const [calculationResult, setCalculationResult] = useState<InventoryCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationsHistory, setCalculationsHistory] = useState<InventoryPlanResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedSubdivision, setSelectedSubdivision] = useState<Subdivision | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  // Новое состояние: проверка на январь 2023 года
  const [isJanuary2023, setIsJanuary2023] = useState(false);
  
  // Состояние для отладки
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Загрузка начальных данных при монтировании компонента
  useEffect(() => {
    console.log('Компонент страницы плана запасов загружен');
    loadInitialData();
    loadCalculationsHistory();
  }, []);

  // Отслеживание изменения полей формы для активации кнопки расчета
  useEffect(() => {
    const values = form.getFieldsValue();
    const isValid = !!values.subdivisionId && !!values.materialId && !!values.date;
    setIsFormValid(isValid);

    // Проверяем, является ли выбранная дата январём 2023 года
    if (values.date) {
      const isJan2023 = values.date.year() === 2023 && values.date.month() === 0; // month=0 для января
      setIsJanuary2023(isJan2023);
    } else {
      setIsJanuary2023(false);
    }

    // Обновляем выбранные подразделение и материал при изменении
    if (values.subdivisionId) {
      const subdivision = subdivisions.find(sub => sub.id === values.subdivisionId);
      setSelectedSubdivision(subdivision || null);
    }
    
    if (values.materialId) {
      const material = materials.find(mat => mat.id === values.materialId);
      setSelectedMaterial(material || null);
    }
  }, [form, subdivisions, materials]);

  /**
   * Загрузка справочников подразделений и материалов
   */
  const loadInitialData = async () => {
    console.log('Начало загрузки справочников...');
    setLoadingInitial(true);
    setError(null);
    setDebugInfo('Загрузка справочников...');
    
    try {
      // Параллельная загрузка справочников
      const [subdivisionsData, materialsData] = await Promise.all([
        getSubdivisions(),
        getMaterials(),
      ]);
      
      console.log('Подразделения загружены:', subdivisionsData.length);
      console.log('Материалы загружены:', materialsData.length);
      
      setSubdivisions(subdivisionsData);
      setMaterials(materialsData);
      
      // Если справочники пусты, показываем предупреждение
      if (subdivisionsData.length === 0 || materialsData.length === 0) {
        setError('Нет доступных подразделений или материалов для расчета');
        setDebugInfo('Справочники пусты. Проверьте подключение к серверу.');
      } else {
        setDebugInfo(`Загружено: ${subdivisionsData.length} подразделений, ${materialsData.length} материалов`);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки начальных данных:', error);
      const errorMsg = error.apiError?.message || error.message || 'Ошибка загрузки справочников. Проверьте подключение к серверу.';
      setError(errorMsg);
      setDebugInfo(`Ошибка: ${errorMsg}`);
    } finally {
      setLoadingInitial(false);
    }
  };

  /**
   * Загрузка истории сохраненных расчетов
   */
  const loadCalculationsHistory = async () => {
    console.log('Загрузка истории расчетов...');
    setIsLoading(true);
    setError(null);
    
    try {
      // Используем правильный метод getInventoryPlans (GET)
      const response = await getInventoryPlans();
      console.log('История расчетов загружена:', response.length, 'записей');
      setCalculationsHistory(response);
    } catch (error: any) {
      console.error('Ошибка загрузки истории расчетов:', error);
      const errorMsg = error.apiError?.message || error.message || 'Ошибка загрузки истории расчетов. Проверьте подключение к серверу.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Выполнение расчета плана запасов
   * ВАЖНО: Для января 2023 года расчет НЕВОЗМОЖЕН - данные уже загружены вручную
   */
  const handleCalculate = async () => {
    console.log('Начало расчета плана запасов...');
    
    if (!isFormValid) {
      message.warning('Заполните все поля формы для расчета');
      return;
    }

    // БЛОКИРОВКА: Проверка на январь 2023 года
    // Если выбрана дата январь 2023, показываем сообщение об ошибке и прерываем выполнение
    if (isJanuary2023) {
      message.error('Расчет для января 2023 года невозможен. Данные уже загружены вручную.');
      return;
    }

    try {
      const values = await form.validateFields();
      setIsCalculating(true);
      setError(null);
      setDebugInfo('Выполняется расчет...');

      // Преобразуем дату в начало месяца в формате YYYY-MM-DD
      const date = values.date.startOf('month').format('YYYY-MM-DD');
      
      console.log('Отправка запроса на расчет с данными:', {
        subdivisionId: values.subdivisionId,
        materialId: values.materialId,
        date: date,
        selectedSubdivision: selectedSubdivision?.name,
        selectedMaterial: selectedMaterial?.name,
      });

      // Делаем обычный расчет через API
      const requestData: InventoryCalculationRequest = {
        subdivisionId: values.subdivisionId,
        materialId: values.materialId,
        date: date,
      };

      const result = await calculateInventoryPlan(requestData);
      
      console.log('Расчет выполнен успешно:', result);
      setDebugInfo('Расчет выполнен успешно');
      
      setCalculationResult(result);
      message.success('Расчет выполнен успешно');
      
    } catch (error: any) {
      console.error('Детали ошибки расчета:', error);
      
      // Обработка ошибок API
      if (error.apiError) {
        const apiError = error.apiError;
        
        let errorMessage = apiError.message || 'Ошибка при расчете';
        
        // Детализированные сообщения для разных статусов
        if (apiError.status === 404) {
          errorMessage = 'Сервер расчета не найден. Проверьте: 1) Запущен ли бэкенд-сервер 2) Правильность URL в конфигурации прокси';
          setDebugInfo(`404 ошибка: Эндпоинт не найден. Проверьте бэкенд на порту 5000`);
        } else if (apiError.status === 500) {
          errorMessage = 'Ошибка на сервере при расчете. Проверьте данные и логи сервера.';
          setDebugInfo(`500 ошибка: Проблема на сервере: ${apiError.details}`);
        } else if (apiError.status === 400) {
          errorMessage = `Неверный запрос: ${apiError.details || 'Проверьте входные данные'}`;
          setDebugInfo(`400 ошибка: ${apiError.details}`);
        }
        
        message.error(errorMessage);
        setError(`${errorMessage} ${apiError.details ? `: ${apiError.details}` : ''}`);
        
        // Показываем модальное окно с дополнительной информацией для отладки
        Modal.error({
          title: 'Ошибка расчета',
          content: (
            <div>
              <p><strong>Сообщение:</strong> {errorMessage}</p>
              <p><strong>Статус:</strong> {apiError.status || 'Неизвестно'}</p>
              <p><strong>Детали:</strong> {apiError.details || 'Нет дополнительной информации'}</p>
              <p><strong>Рекомендации:</strong></p>
              <ol>
                <li>Убедитесь, что бэкенд-сервер (.NET) запущен на порту 5000</li>
                <li>Проверьте конфигурацию прокси в файле .umirc.ts</li>
                <li>Убедитесь, что эндпоинт /api/InventoryPlans/calculate существует на бэкенде</li>
                <li>Проверьте консоль браузера для деталей ошибки</li>
              </ol>
            </div>
          ),
          width: 700,
        });
        
      } else if (error.message) {
        setError(error.message);
        message.error(error.message);
        setDebugInfo(`Ошибка: ${error.message}`);
      } else {
        const unknownError = 'Неизвестная ошибка при расчете';
        setError(unknownError);
        message.error(unknownError);
        setDebugInfo(`Неизвестная ошибка`);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * Сохранение результата расчета в базу данных
   * ВАЖНО: Для января 2023 года сохранение невозможно, так как расчет не выполняется
   */
  const handleSave = async () => {
    if (!calculationResult) {
      message.warning('Сначала выполните расчет плана запасов');
      return;
    }

    // Дополнительная проверка на январь 2023 (на всякий случай)
    const values = form.getFieldsValue();
    if (values.date && values.date.year() === 2023 && values.date.month() === 0) {
      message.error('Сохранение плана для января 2023 года невозможно');
      return;
    }

    try {
      const values = await form.validateFields();
      
      // Получаем дату начала месяца
      const date = values.date.startOf('month').format('YYYY-MM-DD');
      
      console.log('Сохранение плана с датой:', date);
      
      await createInventoryPlan({
        subdivisionId: values.subdivisionId,
        materialId: values.materialId,
        date: date,
        quantity: Math.round(calculationResult.calculatedQuantity),
      });

      message.success('План запасов успешно сохранен');
      
      // Обновляем историю и сбрасываем форму
      await loadCalculationsHistory();
      form.resetFields();
      setCalculationResult(null);
      setIsFormValid(false);
      setSelectedSubdivision(null);
      setSelectedMaterial(null);
      setIsJanuary2023(false);
    } catch (error: any) {
      console.error('Ошибка сохранения:', error);
      if (error.response?.status === 400) {
        message.error(error.response.data || 'План запасов уже существует для этих параметров');
      } else if (error.response?.status === 404) {
        message.error('Не найдены необходимые данные для создания плана');
      } else {
        message.error('Ошибка при сохранении плана запасов');
      }
    }
  };

  /**
   * Удаление сохраненного плана запасов
   */
  const handleDelete = async (id: number) => {
    try {
      await deleteInventoryPlan(id);
      message.success('План запасов удален');
      await loadCalculationsHistory();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      message.error('Ошибка при удалении плана запасов');
    }
  };

  /**
   * Сброс формы и результатов расчета
   */
  const handleReset = () => {
    form.resetFields();
    setCalculationResult(null);
    setIsFormValid(false);
    setSelectedSubdivision(null);
    setSelectedMaterial(null);
    setIsJanuary2023(false);
    setDebugInfo('');
  };

  /**
   * Обработчик изменения полей формы
   */
  const handleFieldChange = (changedValues: any, allValues: any) => {
    const isValid = !!allValues.subdivisionId && !!allValues.materialId && !!allValues.date;
    setIsFormValid(isValid);
  };

  /**
   * Преобразование типа подразделения в читаемый текст
   */
  const getSubdivisionTypeText = (type?: string) => {
    if (!type) return '';
    switch (type) {
      case 'Trading': return 'Торговое';
      case 'Production': return 'Производственное';
      case 'Warehouse': return 'Склад';
      default: return type;
    }
  };

  /**
   * Преобразование типа материала в читаемый текст
   */
  const getMaterialTypeText = (type?: string) => {
    if (!type) return '';
    switch (type) {
      case 'RawMaterial': return 'Сырьё';
      case 'FinishedProduct': return 'Готовая продукция';
      case 'SemiFinishedProduct': return 'Полуфабрикат';
      default: return type;
    }
  };

  /**
   * Фильтрация истории расчетов по поисковому запросу
   */
  const filteredHistory = useMemo(() => {
    if (!searchText.trim()) return calculationsHistory;

    const searchLower = searchText.toLowerCase();
    return calculationsHistory.filter(item => 
      item.subdivisionName.toLowerCase().includes(searchLower) ||
      item.materialName.toLowerCase().includes(searchLower) ||
      moment(item.date).format('MMMM YYYY').toLowerCase().includes(searchLower) ||
      moment(item.date).format('MM.YYYY').includes(searchText) ||
      item.quantity.toString().includes(searchText)
    );
  }, [calculationsHistory, searchText]);

  // Колонки таблицы истории расчетов
  const columns: ColumnsType<InventoryPlanResponse> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Подразделение',
      dataIndex: 'subdivisionName',
      key: 'subdivisionName',
      render: (name: string) => <div>{name}</div>,
      sorter: (a, b) => a.subdivisionName.localeCompare(b.subdivisionName),
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (name: string) => <div>{name}</div>,
      sorter: (a, b) => a.materialName.localeCompare(b.materialName),
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => {
        const dateMoment = moment(date, 'YYYY-MM-DD');
        return (
          <div>
            {dateMoment.format('MMMM YYYY')}
            <div style={{ fontSize: '12px', color: '#999' }}>
              {dateMoment.format('DD.MM.YYYY')}
            </div>
          </div>
        );
      },
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (quantity: number) => (
        <Statistic value={quantity} valueStyle={{ fontSize: '16px' }} precision={0} />
      ),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record: InventoryPlanResponse) => (
        <Popconfirm
          title="Удалить этот план запасов?"
          description="Вы уверены, что хотите удалить этот план?"
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          onConfirm={() => handleDelete(record.id)}
          okText="Да"
          cancelText="Нет"
        >
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // Отображение загрузки при первоначальной загрузке данных
  if (loadingInitial) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>Загрузка данных...</div>
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        План запасов на начало месяца
      </Title>
      
      {/* Блок отображения ошибок */}
      {error && (
        <Alert
          message="Ошибка"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={() => {
              setError(null);
              loadInitialData();
              loadCalculationsHistory();
            }}>
              Повторить
            </Button>
          }
        />
      )}
      
      {/* Информация для отладки (можно скрыть в продакшене) */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <Alert
          message="Информация для отладки"
          description={debugInfo}
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16, fontSize: '12px' }}
        />
      )}
      
      <Row gutter={16}>
        {/* Левая колонка: форма расчета */}
        <Col xs={24} md={12}>
          <Card 
            title="Калькулятор плана запасов"
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleReset}
                size="small"
                disabled={isCalculating}
              >
                Сбросить
              </Button>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFieldChange}
            >
              {/* Поле выбора подразделения */}
              <Form.Item
                name="subdivisionId"
                label="Подразделение"
                rules={[{ required: true, message: 'Выберите подразделение' }]}
              >
                <Select 
                  placeholder="Выберите подразделение"
                  loading={loadingInitial}
                  onChange={(value) => {
                    const subdivision = subdivisions.find(sub => sub.id === value);
                    setSelectedSubdivision(subdivision || null);
                  }}
                  disabled={loadingInitial || subdivisions.length === 0}
                  notFoundContent={subdivisions.length === 0 ? "Нет доступных подразделений" : null}
                >
                  {subdivisions.map((sub) => (
                    <Option key={sub.id} value={sub.id}>
                      {sub.name}
                      {sub.type && (
                        <span style={{ color: '#999', marginLeft: '8px' }}>
                          ({getSubdivisionTypeText(sub.type)})
                        </span>
                      )}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Поле выбора материала */}
              <Form.Item
                name="materialId"
                label="Материал"
                rules={[{ required: true, message: 'Выберите материал' }]}
              >
                <Select 
                  placeholder="Выберите материал"
                  loading={loadingInitial}
                  onChange={(value) => {
                    const material = materials.find(mat => mat.id === value);
                    setSelectedMaterial(material || null);
                  }}
                  disabled={loadingInitial || materials.length === 0}
                  notFoundContent={materials.length === 0 ? "Нет доступных материалов" : null}
                >
                  {materials.map((mat) => (
                    <Option key={mat.id} value={mat.id}>
                      {mat.name}
                      {mat.type && (
                        <span style={{ color: '#999', marginLeft: '8px' }}>
                          ({getMaterialTypeText(mat.type)})
                        </span>
                      )}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Поле выбора месяца расчета */}
              <Form.Item
                name="date"
                label="Месяц расчета"
                rules={[{ 
                  required: true, 
                  message: 'Выберите месяц для расчета' 
                }]}
              >
                <DatePicker
                  picker="month"
                  style={{ width: '100%' }}
                  format="MMMM YYYY"
                  placeholder="Выберите месяц и год"
                  allowClear={false}
                  disabledDate={(current) => {
                    // БЛОКИРОВКА: Запрещаем выбор января 2023 года
                    // current - объект moment для выбранной даты
                    return current && current.year() === 2023 && current.month() === 0; // month=0 для января
                  }}
                />
              </Form.Item>

              {/* Предупреждение о блокировке расчета для января 2023 */}
              {isJanuary2023 && (
                <Alert
                  message="Расчет невозможен"
                  description={
                    <div>
                      <p>Для января 2023 года расчет плана запасов невозможен.</p>
                      <p>Данные за этот месяц уже загружены вручную и доступны в истории расчетов.</p>
                    </div>
                  }
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* Кнопка расчета */}
              <Form.Item>
                <Space>
                  <Tooltip
                    title={
                      isJanuary2023 
                        ? "Расчет для января 2023 года невозможен. Данные уже загружены вручную."
                        : !isFormValid 
                        ? "Заполните все поля формы для расчета"
                        : ""
                    }
                  >
                    <Button
                      type="primary"
                      icon={<CalculatorOutlined />}
                      onClick={handleCalculate}
                      loading={isCalculating}
                      disabled={!isFormValid || loadingInitial || isJanuary2023}
                    >
                      Рассчитать план запасов
                    </Button>
                  </Tooltip>
                </Space>
              </Form.Item>
            </Form>

            {/* Блок отображения результатов расчета */}
            {calculationResult && (
              <Card 
                type="inner" 
                title="Результаты расчета"
                style={{ marginTop: 16 }}
              >
                {/* Отображение для обычного расчета */}
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Дата расчета">
                    <strong>{moment(calculationResult.date, 'YYYY-MM-DD').format('MMMM YYYY')}</strong>
                  </Descriptions.Item>
                  {calculationResult.subdivisionName && (
                    <Descriptions.Item label="Подразделение">
                      {calculationResult.subdivisionName}
                    </Descriptions.Item>
                  )}
                  {calculationResult.materialName && (
                    <Descriptions.Item label="Материал">
                      {calculationResult.materialName}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="План продаж">
                    {calculationResult.salesPlan} единиц
                  </Descriptions.Item>
                  <Descriptions.Item label="Норматив обеспеченности">
                    {calculationResult.stockNorm} дней
                  </Descriptions.Item>
                  <Descriptions.Item label="Дней в месяце">
                    {calculationResult.daysInMonth} дней
                  </Descriptions.Item>
                  {calculationResult.formula && (
                    <Descriptions.Item label="Формула расчета">
                      <div style={{ fontFamily: 'monospace' }}>
                        {calculationResult.formula}
                      </div>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Результат расчета">
                    <Statistic
                      value={calculationResult.calculatedQuantity}
                      precision={2}
                      valueStyle={{ color: '#3f8600', fontSize: '24px', fontWeight: 'bold' }}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Целочисленный результат">
                    <Statistic
                      value={Math.round(calculationResult.calculatedQuantity)}
                      precision={0}
                      valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    />
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      (для сохранения в системе)
                    </div>
                  </Descriptions.Item>
                </Descriptions>

                {/* Кнопка сохранения результатов */}
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Tooltip
                    title={
                      isJanuary2023 
                        ? "Сохранение для января 2023 года невозможно" 
                        : ""
                    }
                  >
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      size="large"
                      style={{ minWidth: '200px' }}
                      loading={isLoading}
                      disabled={isJanuary2023}
                    >
                      Сохранить план запасов
                    </Button>
                  </Tooltip>
                </div>
              </Card>
            )}
          </Card>
        </Col>

        {/* Правая колонка: сохраненные расчеты */}
        <Col xs={24} md={12}>
          <Card 
            title="Рассчитанные планы запасов"
            extra={
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadCalculationsHistory}
                  size="small"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Обновить
                </Button>
                {searchText && (
                  <Button 
                    size="small"
                    onClick={() => setSearchText('')}
                  >
                    Сбросить поиск
                  </Button>
                )}
              </Space>
            }
          >
            {/* Поиск в истории расчетов */}
            <Search
              placeholder="Поиск по подразделению, материалу, дате или количеству"
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => setSearchText(value)}
              style={{ marginBottom: 16 }}
            />

            {/* Информация о результатах поиска */}
            {searchText && (
              <div style={{ marginBottom: 16, fontSize: '14px', color: '#666' }}>
                Найдено записей: {filteredHistory.length}
                {filteredHistory.length !== calculationsHistory.length && (
                  <span> из {calculationsHistory.length}</span>
                )}
              </div>
            )}

            <Table
              rowKey="id"
              columns={columns}
              dataSource={filteredHistory}
              loading={isLoading}
              pagination={{
                pageSize: 5,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} записей`,
              }}
              size="small"
              scroll={{ x: 600, y: 400 }}
              locale={{
                emptyText: searchText ? 'Нет результатов по вашему запросу' : 'Нет сохраненных планов запасов'
              }}
            />

          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InventoryPlanPage;