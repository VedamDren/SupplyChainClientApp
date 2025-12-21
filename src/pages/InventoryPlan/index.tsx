import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Tag,
  Tabs,
  InputRef,
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
  ShopOutlined,
  BuildOutlined,
  ExperimentOutlined,
  FilterFilled,
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
import type { ColumnsType, ColumnType } from 'antd/es/table';
import type { FilterConfirmProps } from 'antd/es/table/interface';
import Highlighter from 'react-highlight-words';

const { Option } = Select;
const { Title } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

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
  transferPlan?: number;
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

// Типы данных для поиска
type DataIndex = keyof InventoryPlanResponse;

// Типы подразделений и материалов
const SUBDIVISION_TYPES = {
  TRADING: 'Trading',
  PRODUCTION: 'Production',
};

const MATERIAL_TYPES = {
  RAW_MATERIAL: 'RawMaterial',
  FINISHED_PRODUCT: 'FinishedProduct',
};

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
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [isJanuary2023, setIsJanuary2023] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('calculate');
  
  // Состояния для поиска по колонкам
  const [searchState, setSearchState] = useState<{
    searchText: string;
    searchedColumn: string;
  }>({
    searchText: '',
    searchedColumn: '',
  });
  const searchInput = useRef<InputRef>(null);

  // Состояние для отслеживания значений формы
  const [formValues, setFormValues] = useState<CalculationFormValues>({
    subdivisionId: undefined as any,
    materialId: undefined as any,
    date: undefined as any,
  });

  // Загрузка начальных данных при монтировании компонента
  useEffect(() => {
    console.log('Компонент страницы плана запасов загружен');
    loadInitialData();
    loadCalculationsHistory();
  }, []);

  // Эффект для фильтрации материалов при изменении выбранного подразделения
  useEffect(() => {
    if (selectedSubdivision && materials.length > 0) {
      filterMaterialsBySubdivision(selectedSubdivision);
    } else {
      setFilteredMaterials(materials);
    }
  }, [selectedSubdivision, materials]);

  // Эффект для проверки валидности формы
  useEffect(() => {
    const { subdivisionId, materialId, date } = formValues;
    const isValid = !!subdivisionId && !!materialId && !!date;
    setIsFormValid(isValid);
  }, [formValues]);

//Обработчик изменения значений формы

  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    setFormValues(allValues);
    
    // Проверяем дату на январь 2023
    if (allValues.date) {
      const isJan2023 = allValues.date.year() === 2023 && allValues.date.month() === 0;
      setIsJanuary2023(isJan2023);
    } else {
      setIsJanuary2023(false);
    }
  };

//Обработчик изменения подразделения

  const handleSubdivisionChange = (value: number) => {
    const subdivision = subdivisions.find(sub => sub.id === value);
    setSelectedSubdivision(subdivision || null);
    
    // Обновляем значение в форме
    form.setFieldsValue({ subdivisionId: value });
  };

//Обработчик изменения материала

  const handleMaterialChange = (value: number) => {
    const material = filteredMaterials.find(mat => mat.id === value);
    setSelectedMaterial(material || null);
    
    // Обновляем значение в форме
    form.setFieldsValue({ materialId: value });
  };

//Фильтрация материалов в зависимости от типа выбранного подразделения

  const filterMaterialsBySubdivision = (subdivision: Subdivision) => {
    let filtered: Material[] = [];
    
    switch (subdivision.type) {
      case SUBDIVISION_TYPES.TRADING:
        filtered = materials.filter(material => 
          material.type === MATERIAL_TYPES.FINISHED_PRODUCT
        );
        break;
        
      case SUBDIVISION_TYPES.PRODUCTION:
        filtered = materials;
        break;
        
      default:
        filtered = materials;
        break;
    }
    
    setFilteredMaterials(filtered);
    
    // Если выбранный материал больше не доступен в отфильтрованном списке, сбрасываем его
    const currentMaterialId = form.getFieldValue('materialId');
    if (currentMaterialId && !filtered.some(m => m.id === currentMaterialId)) {
      form.setFieldsValue({ materialId: undefined });
      setSelectedMaterial(null);
    }
  };

//Загрузка справочников подразделений и материалов

  const loadInitialData = async () => {
    console.log('Начало загрузки справочников...');
    setLoadingInitial(true);
    setError(null);
    setDebugInfo('Загрузка справочников...');
    
    try {
      const [subdivisionsData, materialsData] = await Promise.all([
        getSubdivisions(),
        getMaterials(),
      ]);
      
      console.log('Подразделения загружены:', subdivisionsData.length);
      console.log('Материалы загружены:', materialsData.length);
      
      setSubdivisions(subdivisionsData);
      setMaterials(materialsData);
      setFilteredMaterials(materialsData);
      
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

//Загрузка истории сохраненных расчетов

  const loadCalculationsHistory = async () => {
    console.log('Загрузка истории расчетов...');
    setIsLoading(true);
    setError(null);
    
    try {
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

//Получение названия типа расчета для отображения

  const getCalculationTypeName = () => {
    if (!selectedSubdivision || !selectedMaterial) return '';
    
    if (selectedSubdivision.type === SUBDIVISION_TYPES.TRADING) {
      return 'Расчет для торгового подразделения';
    } else if (selectedSubdivision.type === SUBDIVISION_TYPES.PRODUCTION) {
      if (selectedMaterial.type === MATERIAL_TYPES.RAW_MATERIAL) {
        return 'Расчет для сырья в производственном подразделении';
      } else {
        return 'Расчет для готовой продукции в производственном подразделении';
      }
    }
    
    return 'Расчет плана запасов';
  };

//Получение описания формулы для текущего типа расчета

  const getCalculationFormulaDescription = () => {
    if (!selectedSubdivision || !selectedMaterial) return '';
    
    if (selectedSubdivision.type === SUBDIVISION_TYPES.TRADING) {
      return 'Формула: (План продаж × Норматив обеспеченности запасом) ÷ 30';
    } else if (selectedSubdivision.type === SUBDIVISION_TYPES.PRODUCTION) {
      if (selectedMaterial.type === MATERIAL_TYPES.RAW_MATERIAL) {
        return 'Формула: (План списания сырья в производство × Норматив обеспеченности запасом) ÷ 30';
      } else {
        return 'Формула: (Сумма планов перемещений предыдущего месяца × Норматив текущего месяца) ÷ 30';
      }
    }
    
    return 'Формула расчета будет определена автоматически';
  };

//Получение иконки для типа расчета

  const getCalculationTypeIcon = () => {
    if (!selectedSubdivision) return <CalculatorOutlined />;
    
    if (selectedSubdivision.type === SUBDIVISION_TYPES.TRADING) {
      return <ShopOutlined />;
    } else if (selectedSubdivision.type === SUBDIVISION_TYPES.PRODUCTION) {
      if (selectedMaterial?.type === MATERIAL_TYPES.RAW_MATERIAL) {
        return <ExperimentOutlined />;
      } else {
        return <BuildOutlined />;
      }
    }
    
    return <CalculatorOutlined />;
  };

//Выполнение расчета плана запасов

  const handleCalculate = async () => {
    console.log('Начало расчета плана запасов...');
    
    if (!isFormValid) {
      message.warning('Заполните все поля формы для расчета');
      return;
    }

    if (isJanuary2023) {
      message.error('Расчет для января 2023 года невозможен. Данные уже загружены вручную.');
      return;
    }

    try {
      const values = await form.validateFields();
      setIsCalculating(true);
      setError(null);
      setDebugInfo('Выполняется расчет...');

      const date = values.date.startOf('month').format('YYYY-MM-DD');
      
      console.log('Отправка запроса на расчет:', {
        subdivisionId: values.subdivisionId,
        materialId: values.materialId,
        date: date,
        selectedSubdivision: selectedSubdivision?.name,
        selectedMaterial: selectedMaterial?.name,
      });

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
      
      if (error.apiError) {
        const apiError = error.apiError;
        
        let errorMessage = apiError.message || 'Ошибка при расчете';
        
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
        
        Modal.error({
          title: 'Ошибка расчета',
          content: (
            <div>
              <p><strong>Сообщение:</strong> {errorMessage}</p>
              <p><strong>Статус:</strong> {apiError.status || 'Неизвестно'}</p>
              <p><strong>Детали:</strong> {apiError.details || 'Нет дополнительной информации'}</p>
              <p><strong>Тип расчета:</strong> {getCalculationTypeName()}</p>
              <p><strong>Рекомендации:</strong></p>
              <ol>
                <li>Убедитесь, что бэкенд-сервер (.NET) запущен</li>
                <li>Проверьте конфигурацию прокси</li>
                <li>Убедитесь, что выбраны корректные подразделение и материал</li>
                <li>Проверьте наличие необходимых данных (планы продаж, списания сырья и т.д.)</li>
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

//Сохранение результата расчета в базу данных

  const handleSave = async () => {
    if (!calculationResult) {
      message.warning('Сначала выполните расчет плана запасов');
      return;
    }

    const values = form.getFieldsValue();
    if (values.date && values.date.year() === 2023 && values.date.month() === 0) {
      message.error('Сохранение плана для января 2023 года невозможно');
      return;
    }

    try {
      const values = await form.validateFields();
      
      const date = values.date.startOf('month').format('YYYY-MM-DD');
      
      console.log('Сохранение плана с датой:', date);
      
      await createInventoryPlan({
        subdivisionId: values.subdivisionId,
        materialId: values.materialId,
        date: date,
        quantity: Math.round(calculationResult.calculatedQuantity),
      });

      message.success('План запасов успешно сохранен');
      
      await loadCalculationsHistory();
      handleReset();
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

//Удаление сохраненного плана запасов

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

//Сброс формы и результатов расчета

  const handleReset = () => {
    form.resetFields();
    setCalculationResult(null);
    setIsFormValid(false);
    setSelectedSubdivision(null);
    setSelectedMaterial(null);
    setFormValues({
      subdivisionId: undefined as any,
      materialId: undefined as any,
      date: undefined as any,
    });
    setIsJanuary2023(false);
    setDebugInfo('');
  };

//Преобразование типа подразделения в читаемый текст

  const getSubdivisionTypeText = (type?: string) => {
    if (!type) return '';
    switch (type) {
      case SUBDIVISION_TYPES.TRADING: return 'Торговое';
      case SUBDIVISION_TYPES.PRODUCTION: return 'Производственное';
      default: return type;
    }
  };

//Преобразование типа материала в читаемый текст

  const getMaterialTypeText = (type?: string) => {
    if (!type) return '';
    switch (type) {
      case MATERIAL_TYPES.RAW_MATERIAL: return 'Сырьё';
      case MATERIAL_TYPES.FINISHED_PRODUCT: return 'Готовая продукция';
      default: return type;
    }
  };

//Определение цвета тега для типа материала

  const getMaterialTypeColor = (type?: string) => {
    if (!type) return 'default';
    switch (type) {
      case MATERIAL_TYPES.RAW_MATERIAL: return 'orange';
      case MATERIAL_TYPES.FINISHED_PRODUCT: return 'green';
      default: return 'default';
    }
  };

//Определение цвета тега для типа подразделения

  const getSubdivisionTypeColor = (type?: string) => {
    if (!type) return 'default';
    switch (type) {
      case SUBDIVISION_TYPES.TRADING: return 'purple';
      case SUBDIVISION_TYPES.PRODUCTION: return 'cyan';
      default: return 'default';
    }
  };

//Обработчик поиска по колонкам таблицы

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: DataIndex,
  ) => {
    confirm();
    setSearchState({
      searchText: selectedKeys[0],
      searchedColumn: dataIndex,
    });
  };

//Обработчик сброса поиска по колонкам таблицы

  const handleResetSearch = (clearFilters: () => void, confirm: (param?: FilterConfirmProps) => void) => {
    clearFilters();
    setSearchState({
      searchText: '',
      searchedColumn: '',
    });
    confirm();
  };

//Получение конфигурации поиска для колонок таблицы

  const getColumnSearchProps = (dataIndex: DataIndex): ColumnType<InventoryPlanResponse> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Поиск по ${dataIndex === 'subdivisionName' ? 'подразделению' : dataIndex === 'materialName' ? 'материалу' : 'дате'}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Поиск
          </Button>
          <Button
            onClick={() => {
              if (clearFilters) {
                handleResetSearch(clearFilters, confirm);
              }
            }}
            size="small"
            style={{ width: 90 }}
          >
            Сбросить
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) => {
      const recordValue = record[dataIndex];
      if (dataIndex === 'date') {
        // Для даты ищем в разных форматах
        const dateFormats = [
          moment(recordValue).format('MMMM YYYY'),
          moment(recordValue).format('MM.YYYY'),
          moment(recordValue).format('DD.MM.YYYY'),
          moment(recordValue).format('YYYY-MM-DD'),
        ];
        return dateFormats.some(format => 
          format.toLowerCase().includes((value as string).toLowerCase())
        );
      }
      
      return recordValue
        ? recordValue.toString().toLowerCase().includes((value as string).toLowerCase())
        : false;
    },
    render: (text) => {
      if (searchState.searchedColumn === dataIndex && searchState.searchText) {
        return (
          <Highlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchState.searchText]}
            autoEscape
            textToHighlight={text ? text.toString() : ''}
          />
        );
      }
      return text;
    },
  });

  // Колонки таблицы истории расчетов с возможностью поиска
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
      ...getColumnSearchProps('subdivisionName'),
      sorter: (a, b) => a.subdivisionName.localeCompare(b.subdivisionName),
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      ...getColumnSearchProps('materialName'),
      sorter: (a, b) => a.materialName.localeCompare(b.materialName),
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      ...getColumnSearchProps('date'),
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

//Фильтрация истории расчетов по поисковому запросу

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
        <CalculatorOutlined /> План запасов на начало месяца
      </Title>
      
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
      
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: 24 }}>
        <TabPane tab="Расчет" key="calculate" icon={<CalculatorOutlined />} />
        <TabPane tab="Рассчитанные запасы" key="history" icon={<SearchOutlined />} />
      </Tabs>

      {activeTab === 'calculate' ? (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card 
              title={
                <span>
                  <CalculatorOutlined /> Калькулятор плана запасов
                </span>
              }
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
              {selectedSubdivision && (
                <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f0f5ff', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    {getCalculationTypeIcon()}
                    <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                      {getCalculationTypeName()}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {getCalculationFormulaDescription()}
                  </div>
                </div>
              )}

              <Form
                form={form}
                layout="vertical"
                onValuesChange={handleFormValuesChange}
              >
                <Form.Item
                  name="subdivisionId"
                  label="Подразделение"
                  rules={[{ required: true, message: 'Выберите подразделение' }]}
                >
                  <Select 
                    placeholder="Выберите подразделение"
                    loading={loadingInitial}
                    onChange={handleSubdivisionChange}
                    disabled={loadingInitial || subdivisions.length === 0}
                    notFoundContent={subdivisions.length === 0 ? "Нет доступных подразделений" : null}
                  >
                    {subdivisions.map((sub) => (
                      <Option key={sub.id} value={sub.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{sub.name}</span>
                          {sub.type && (
                            <Tag color={getSubdivisionTypeColor(sub.type)}>
                              {getSubdivisionTypeText(sub.type)}
                            </Tag>
                          )}
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="materialId"
                  label="Материал"
                  rules={[{ required: true, message: 'Выберите материал' }]}
                >
                  <Select 
                    placeholder="Выберите материал"
                    loading={loadingInitial}
                    onChange={handleMaterialChange}
                    disabled={loadingInitial || filteredMaterials.length === 0}
                    notFoundContent={
                      filteredMaterials.length === 0 
                        ? selectedSubdivision?.type === SUBDIVISION_TYPES.TRADING
                          ? "Нет доступной готовой продукции для торгового подразделения"
                          : "Нет доступных материалов"
                        : null
                    }
                  >
                    {filteredMaterials.map((mat) => (
                      <Option key={mat.id} value={mat.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{mat.name}</span>
                          {mat.type && (
                            <Tag color={getMaterialTypeColor(mat.type)}>
                              {getMaterialTypeText(mat.type)}
                            </Tag>
                          )}
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {(selectedSubdivision || selectedMaterial) && (
                  <Alert
                    message="Выбраны следующие данные:"
                    description={
                      <div>
                        {selectedSubdivision && (
                          <div>
                            <strong>Подразделение:</strong> {selectedSubdivision.name} 
                            {selectedSubdivision.type && (
                              <Tag color={getSubdivisionTypeColor(selectedSubdivision.type)} style={{ marginLeft: '8px' }}>
                                {getSubdivisionTypeText(selectedSubdivision.type)}
                              </Tag>
                            )}
                          </div>
                        )}
                        {selectedMaterial && (
                          <div style={{ marginTop: '8px' }}>
                            <strong>Материал:</strong> {selectedMaterial.name}
                            {selectedMaterial.type && (
                              <Tag color={getMaterialTypeColor(selectedMaterial.type)} style={{ marginLeft: '8px' }}>
                                {getMaterialTypeText(selectedMaterial.type)}
                              </Tag>
                            )}
                          </div>
                        )}
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

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
                      return current && current.year() === 2023 && current.month() === 0;
                    }}
                  />
                </Form.Item>

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
                        size="large"
                        style={{ minWidth: '200px' }}
                      >
                        Рассчитать план запасов
                      </Button>
                    </Tooltip>
                  </Space>
                </Form.Item>
              </Form>

              {calculationResult && (
                <Card 
                  type="inner" 
                  title={
                    <span>
                      <CalculatorOutlined /> Результаты расчета
                      {calculationResult.calculationType && (
                        <Tag color="blue" style={{ marginLeft: '8px' }}>
                          {calculationResult.calculationType}
                        </Tag>
                      )}
                    </span>
                  }
                  style={{ marginTop: 16 }}
                >
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
                    
                    {calculationResult.calculationType?.includes('сырье') ? (
                      <Descriptions.Item label="План списания сырья">
                        {calculationResult.transferPlan || 0} единиц
                      </Descriptions.Item>
                    ) : calculationResult.calculationType?.includes('торгового') ? (
                      <Descriptions.Item label="План продаж">
                        {calculationResult.salesPlan} единиц
                      </Descriptions.Item>
                    ) : calculationResult.calculationType?.includes('производственного') ? (
                      <Descriptions.Item label="План перемещений">
                        {calculationResult.transferPlan || 0} единиц
                      </Descriptions.Item>
                    ) : (
                      <Descriptions.Item label="Исходные данные">
                        {calculationResult.salesPlan > 0 ? `План продаж: ${calculationResult.salesPlan} ед.` : ''}
                        {calculationResult.transferPlan && calculationResult.transferPlan > 0 ? 
                          `План списания/перемещений: ${calculationResult.transferPlan} ед.` : ''}
                      </Descriptions.Item>
                    )}
                    
                    <Descriptions.Item label="Норматив обеспеченности">
                      {calculationResult.stockNorm} дней
                    </Descriptions.Item>
                    <Descriptions.Item label="Дней в месяце">
                      {calculationResult.daysInMonth} дней
                    </Descriptions.Item>
                    {calculationResult.formula && (
                      <Descriptions.Item label="Формула расчета">
                        <div style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
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
                    {calculationResult.message && (
                      <Descriptions.Item label="Примечание">
                        <div style={{ color: '#666', fontStyle: 'italic' }}>
                          {calculationResult.message}
                        </div>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

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

          <Col xs={24} md={12}>
            <Card title="Справочная информация" style={{ marginBottom: 16 }}>
              <Alert
                message="Типы расчетов"
                description={
                  <div>
                    <p><strong>1. Торговое подразделение:</strong></p>
                    <p>• <Tag color="purple">Торговое</Tag> - подразделения для продажи товаров</p>
                    <p>• <Tag color="green">Готовая продукция</Tag> - материалы для продажи</p>
                    <p>• Формула: (План продаж × Норматив обеспеченности запасом) ÷ 30</p>
                    
                    <p style={{ marginTop: '16px' }}><strong>2. Производственное подразделение (Готовая продукция):</strong></p>
                    <p>• <Tag color="cyan">Производственное</Tag> - подразделения для производства</p>
                    <p>• <Tag color="green">Готовая продукция</Tag> - материалы, произведенные для продажи</p>
                    <p>• Формула: (Сумма планов перемещений предыдущего месяца × Норматив текущего месяца) ÷ 30</p>
                    
                    <p style={{ marginTop: '16px' }}><strong>3. Производственное подразделение (Сырьё):</strong></p>
                    <p>• <Tag color="cyan">Производственное</Tag> - подразделения для производства</p>
                    <p>• <Tag color="orange">Сырьё</Tag> - материалы для производства продукции</p>
                    <p>• Формула: (План списания сырья в производство × Норматив обеспеченности запасом) ÷ 30</p>
                    
                    <p style={{ marginTop: '16px' }}><strong>Правила фильтрации:</strong></p>
                    <ul>
                      <li>Для торговых подразделений доступна только <strong>готовая продукция</strong></li>
                      <li>Для производственных подразделений доступны <strong>все типы материалов</strong></li>
                    </ul>
                  </div>
                }
                type="info"
                showIcon
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <Card 
          title={
            <span>
              <SearchOutlined /> Рассчитанные планы запасов
            </span>
          }
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
          <Search
            placeholder="Поиск по подразделению, материалу, дате или количеству"
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => setSearchText(value)}
            style={{ marginBottom: 16 }}
          />

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
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} записей`,
            }}
            size="small"
            scroll={{ x: 600, y: 1200 }}
            locale={{
              emptyText: searchText ? 'Нет результатов по вашему запросу' : 'Нет сохраненных планов запасов'
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default InventoryPlanPage;