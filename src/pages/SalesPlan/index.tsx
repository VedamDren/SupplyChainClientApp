import React, { useState, useEffect } from 'react';
import {
  Table,
  InputNumber,
  message,
  Card,
  Spin,
  Select,
  Alert,
  Button,
  Typography,
  Space,
  Modal,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { upsertMonthlySalesPlan } from '@/services/salesPlanService';
import { request } from '@umijs/max';
import type { SubdivisionDto } from '@/models/subdivision';
import { MaterialDto, MaterialType } from '@/models/material';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

// Интерфейс для ответа от API (скопирован из salesPlanService)
interface SalesPlanResponseDto {
  id: number;
  subdivisionId: number;
  subdivisionName: string;
  materialId: number;
  materialName: string;
  date: string;
  quantity: number;
  createdByUserName?: string;
  lastModifiedByUserName?: string;
  createdDate?: string;
  lastModifiedDate?: string;
  preparedByInfo?: string;
}

// Хук авторизации
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    id?: number;
    name?: string;
    login?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('access_token') ||
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('access_token');
      
      if (token) {
        setIsAuthenticated(true);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserInfo({
            id: payload.userId || payload.sub,
            name: payload.name || payload.username,
            login: payload.login || payload.email
          });
        } catch (error) {
          console.warn('Не удалось извлечь данные пользователя из токена', error);
        }
      } else {
        setIsAuthenticated(false);
        setUserInfo(null);
      }
      setIsLoading(false);
    };

    checkAuth();
    
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return { isAuthenticated, isLoading, userInfo };
};

// Интерфейс для данных плана продаж
interface SalesPlanData {
  subdivisionId: number;
  subdivisionName: string;
  materialId: number;
  materialName: string;
  monthlySales: Record<string, number>;
  preparedByInfo?: string;
  createdByUserName?: string;
  lastModifiedByUserName?: string;
}

// Интерфейс для отслеживания изменений
interface PendingChange {
  subdivisionId: number;
  materialId: number;
  monthKey: string;
  year: number;
  month: number;
  oldValue: number;
  newValue: number;
}

const SalesPlanPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, userInfo } = useAuth();
  
  const [data, setData] = useState<SalesPlanData[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [tradingSubdivisions, setTradingSubdivisions] = useState<SubdivisionDto[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<MaterialDto[]>([]);
  const [lastSavedInfo, setLastSavedInfo] = useState<string>('');
  
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [originalData, setOriginalData] = useState<SalesPlanData[]>([]);

  // Генерация ключей месяцев для API (формат "YYYY-MM")
  const generateMonthKeys = (year: number): string[] => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${year}-${String(month).padStart(2, '0')}`;
    });
  };

  // Генерация отображаемых названий месяцев
  const generateMonthNames = (year: number): string[] => {
    const monthNames = [
      'янв.', 'фев.', 'мар.', 'апр.', 'май', 'июн.',
      'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'
    ];
    const yearShort = year.toString().slice(-2);
    return monthNames.map(month => month + yearShort);
  };

  // Функция загрузки данных
  const loadData = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      console.log('Начало загрузки данных...');

      // Загружаем подразделения и материалы
      const [tradingSubs, allMaterials] = await Promise.all([
        request<SubdivisionDto[]>('/api/Subdivisions', {
          method: 'GET',
          params: { type: 'Trading' },
        }).catch(error => {
          console.error('Ошибка загрузки подразделений:', error);
          return [];
        }),
        request<MaterialDto[]>('/api/Materials', {
          method: 'GET',
        }).catch(error => {
          console.error('Ошибка загрузки материалов:', error);
          return [];
        }),
      ]);

      console.log('Подразделения загружены:', tradingSubs);
      console.log('Материалы загружены:', allMaterials);

      const finishedProducts = allMaterials?.filter(material => 
        material.type === MaterialType.FinishedProduct
      ) || [];

      setTradingSubdivisions(tradingSubs || []);
      setFinishedProducts(finishedProducts);

      if (tradingSubs && finishedProducts && tradingSubs.length > 0 && finishedProducts.length > 0) {
        const monthKeys = generateMonthKeys(year);
        const monthNames = generateMonthNames(year);
        setMonths(monthNames);

        try {
          // Загружаем данные через searchSalesPlans
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          
          const response = await request<SalesPlanResponseDto[]>('/api/SalesPlans/search', {
            method: 'POST',
            data: {
              startDate,
              endDate,
            },
          });
          
          console.log('Данные получены от сервера:', response);
          
          if (response && response.length > 0) {
            // Преобразуем данные в формат таблицы
            const tableData: SalesPlanData[] = [];
            
            // Создаем структуру для группировки
            const groupedData: Record<string, Record<string, number>> = {};
            
            response.forEach(plan => {
              const key = `${plan.subdivisionId}-${plan.materialId}`;
              const date = new Date(plan.date);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              
              if (!groupedData[key]) {
                groupedData[key] = {};
              }
              
              groupedData[key][monthKey] = plan.quantity;
            });
            
            // Создаем записи для таблицы
            tradingSubs.forEach(subdivision => {
              finishedProducts.forEach(product => {
                const key = `${subdivision.id}-${product.id}`;
                const monthlySales: Record<string, number> = {};
                
                // Заполняем месячные данные
                monthKeys.forEach(monthKey => {
                  monthlySales[monthKey] = groupedData[key]?.[monthKey] || 0;
                });
                
                tableData.push({
                  subdivisionId: subdivision.id,
                  subdivisionName: subdivision.name,
                  materialId: product.id,
                  materialName: product.name,
                  monthlySales,
                });
              });
            });
            
            console.log('Сформированные данные для таблицы:', tableData);
            setData(tableData);
            setOriginalData(JSON.parse(JSON.stringify(tableData)));
          } else {
            console.log('Данные не найдены в БД, создаем пустую матрицу');
            // Создаем пустую матрицу
            const newData: SalesPlanData[] = tradingSubs.flatMap(subdivision => 
              finishedProducts.map(product => ({
                subdivisionId: subdivision.id,
                subdivisionName: subdivision.name,
                materialId: product.id,
                materialName: product.name,
                monthlySales: monthKeys.reduce((acc, monthKey) => {
                  acc[monthKey] = 0;
                  return acc;
                }, {} as Record<string, number>)
              }))
            );
            setData(newData);
            setOriginalData(JSON.parse(JSON.stringify(newData)));
          }
        } catch (error: any) {
          console.error('Ошибка загрузки планов:', error);
          message.error('Ошибка загрузки данных плана продаж');
        }
      } else {
        console.warn('Нет данных для отображения');
        setData([]);
        setOriginalData([]);
      }

    } catch (error) {
      console.error('Критическая ошибка загрузки данных:', error);
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка данных при изменении года или авторизации
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      setPendingChanges([]);
      setIsDirty(false);
      setIsEditing(false);
    }
  }, [year, isAuthenticated]);

  // Начать редактирование
  const handleStartEditing = () => {
    setIsEditing(true);
    setPendingChanges([]);
    setIsDirty(false);
    message.info('Режим редактирования включен. Внесите изменения и нажмите "Сохранить изменения".');
  };

  // Отмена редактирования
  const handleCancelEditing = () => {
    if (isDirty) {
      Modal.confirm({
        title: 'Отменить редактирование?',
        content: 'Есть несохраненные изменения. Все изменения будут потеряны.',
        okText: 'Да',
        cancelText: 'Нет',
        onOk: () => {
          setData(JSON.parse(JSON.stringify(originalData)));
          setIsEditing(false);
          setPendingChanges([]);
          setIsDirty(false);
          message.info('Редактирование отменено');
        }
      });
    } else {
      setIsEditing(false);
      message.info('Редактирование отменено');
    }
  };

  // Обработчик изменения значения в ячейке
  const handleValueChange = (
    value: number | null,
    record: SalesPlanData,
    monthKey: string
  ) => {
    if (!isAuthenticated || !isEditing) {
      message.error('Редактирование запрещено');
      return;
    }

    if (value === null) return;
    
    const oldValue = record.monthlySales[monthKey] || 0;
    
    if (value === oldValue) return;
    
    const [yearStr, monthStr] = monthKey.split('-');
    const yearNum = parseInt(yearStr);
    const monthNum = parseInt(monthStr);
    
    const change: PendingChange = {
      subdivisionId: record.subdivisionId,
      materialId: record.materialId,
      monthKey,
      year: yearNum,
      month: monthNum,
      oldValue,
      newValue: value
    };
    
    setPendingChanges(prev => {
      const filtered = prev.filter(p => 
        !(p.subdivisionId === change.subdivisionId && 
          p.materialId === change.materialId && 
          p.monthKey === change.monthKey)
      );
      return [...filtered, change];
    });
    
    setIsDirty(true);
    
    setData(prevData => 
      prevData.map(item => {
        if (item.subdivisionId === record.subdivisionId && 
            item.materialId === record.materialId) {
          return { 
            ...item, 
            monthlySales: { ...item.monthlySales, [monthKey]: value }
          };
        }
        return item;
      })
    );
  };

  // Функция сохранения всех изменений
  const savePendingChanges = async () => {
    if (pendingChanges.length === 0 || !isAuthenticated || !isEditing) {
      message.info('Нет изменений для сохранения');
      return;
    }

    setSaving(true);
    const successChanges: PendingChange[] = [];
    const failedChanges: PendingChange[] = [];

    try {
      // Сохраняем каждое изменение по отдельности
      for (const change of pendingChanges) {
        try {
          console.log('Отправка данных на сервер:', {
            subdivisionId: change.subdivisionId,
            materialId: change.materialId,
            monthKey: change.monthKey,
            quantity: change.newValue
          });

          // Используем upsertMonthlySalesPlan с monthKey
          const response = await upsertMonthlySalesPlan({
            subdivisionId: change.subdivisionId,
            materialId: change.materialId,
            monthKey: change.monthKey,
            quantity: change.newValue
          });

          successChanges.push(change);
          
          // Обновляем информацию о пользователе
          if (response.preparedByInfo) {
            setLastSavedInfo(`Сохранено: ${response.preparedByInfo} (${new Date().toLocaleTimeString()})`);
          } else if (response.createdByUserName) {
            setLastSavedInfo(`Сохранено пользователем: ${response.createdByUserName} (${new Date().toLocaleTimeString()})`);
          } else {
            setLastSavedInfo(`Сохранено (${new Date().toLocaleTimeString()})`);
          }
          
        } catch (error: any) {
          console.error('Ошибка сохранения для изменения:', change, error);
          
          // Форматируем сообщение об ошибке
          let errorMessage = 'Неизвестная ошибка';
          if (error.apiError?.message) {
            errorMessage = error.apiError.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          failedChanges.push(change);
          
          // Откатываем значение в UI для неудачных изменений
          setData(prevData => 
            prevData.map(item => {
              if (item.subdivisionId === change.subdivisionId && 
                  item.materialId === change.materialId) {
                return { 
                  ...item, 
                  monthlySales: { ...item.monthlySales, [change.monthKey]: change.oldValue }
                };
              }
              return item;
            })
          );
          
          message.error(`Ошибка: ${errorMessage}`);
        }
      }

      // Показываем результат
      if (successChanges.length > 0) {
        message.success(`Сохранено ${successChanges.length} изменений`);
        
        // После успешного сохранения перезагружаем данные с сервера
        await loadData();
        
        setIsEditing(false);
        setPendingChanges([]);
        setIsDirty(false);
      }
      
      if (failedChanges.length > 0) {
        message.warning(`Не удалось сохранить ${failedChanges.length} изменений`);
        setPendingChanges(failedChanges);
        setIsDirty(failedChanges.length > 0);
      }
      
    } catch (error: any) {
      console.error('Общая ошибка при сохранении:', error);
      message.error(`Ошибка сохранения: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<SalesPlanData> = [
    {
      title: 'Торговое подразделение',
      dataIndex: 'subdivisionName',
      key: 'subdivisionName',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: 'Готовая продукция',
      dataIndex: 'materialName',
      key: 'materialName',
      fixed: 'left' as const,
      width: 200,
    },
    ...generateMonthKeys(year).map((monthKey, index) => ({
      title: months[index] || monthKey,
      key: monthKey,
      width: 120,
      render: (_: any, record: SalesPlanData) => {
        const pendingChange = pendingChanges.find(p => 
          p.subdivisionId === record.subdivisionId && 
          p.materialId === record.materialId && 
          p.monthKey === monthKey
        );
        
        const value = pendingChange ? pendingChange.newValue : (record.monthlySales[monthKey] || 0);
        const isPending = !!pendingChange;
        
        return (
          <div style={{ position: 'relative' }}>
            {isEditing ? (
              <InputNumber
                value={value}
                min={0}
                precision={0}
                style={{ 
                  width: '100%',
                  backgroundColor: isPending ? '#fffde7' : 'white',
                  borderColor: isPending ? '#faad14' : '#d9d9d9'
                }}
                onChange={(value) => handleValueChange(value, record, monthKey)}
                disabled={saving}
              />
            ) : (
              <div
                style={{
                  padding: '4px 11px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  backgroundColor: '#f5f5f5',
                  minHeight: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
              >
                {value.toLocaleString()}
              </div>
            )}
            {isPending && isEditing && (
              <div 
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  width: 10,
                  height: 10,
                  backgroundColor: '#faad14',
                  borderRadius: '50%',
                  border: '1px solid #d48806'
                }}
                title="Изменено"
              />
            )}
          </div>
        );
      },
    })),
  ];

  // Если проверка авторизации еще не завершена
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin tip="Проверка авторизации..." />
      </div>
    );
  }

  // Если не авторизован
  if (!isAuthenticated) {
    return (
      <Card title="План продаж">
        <Alert
          message="Требуется авторизация"
          description="Для работы с планом продаж необходимо войти в систему."
          type="warning"
          showIcon
          action={
            <a href="/login" style={{ marginLeft: 16 }}>
              Перейти к входу
            </a>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>План продаж</span>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {userInfo && (
                <Text type="secondary">
                  Пользователь: {userInfo.name} ({userInfo.login})
                </Text>
              )}
            </div>
          </div>
        }
        extra={
          <Space>
            <Select 
              value={year} 
              onChange={setYear} 
              style={{ width: 120 }} 
              disabled={saving || loading || isEditing}
            >
              {Array.from({ length: 11 }, (_, i) => 2023 + i).map(y => (
                <Option key={y} value={y}>{y}</Option>
              ))}
            </Select>
            
            {!isEditing ? (
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={handleStartEditing}
                disabled={loading}
              >
                Редактировать план
              </Button>
            ) : (
              <Space>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  onClick={savePendingChanges}
                  loading={saving}
                  disabled={!isDirty}
                >
                  Сохранить изменения
                </Button>
                <Button 
                  icon={<CloseOutlined />}
                  onClick={handleCancelEditing}
                  disabled={saving}
                >
                  Отменить
                </Button>
              </Space>
            )}
          </Space>
        }
      >
        {lastSavedInfo && (
          <Alert message={lastSavedInfo} type="success" showIcon style={{ marginBottom: 16 }} />
        )}
        
        {isEditing && isDirty && (
          <Alert 
            message={`Есть ${pendingChanges.length} несохраненных изменений`}
            type="warning" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Spin spinning={loading || saving} tip={saving ? "Сохранение..." : "Загрузка..."}>
          {data.length > 0 ? (
            <div>
              <Table
                columns={columns}
                dataSource={data}
                scroll={{ x: 2000 }}
                pagination={false}
                rowKey={(record) => `${record.subdivisionId}-${record.materialId}`}
                size="small"
                bordered
              />
              {!isEditing && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '16px', 
                  backgroundColor: '#f6ffed', 
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px'
                }}>
                  <Text type="secondary">
                    <strong>Режим просмотра</strong> - данные загружены из базы данных. Для редактирования нажмите кнопку "Редактировать план"
                  </Text>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              {loading ? (
                <div>
                  <Spin size="large" />
                  <p style={{ marginTop: '16px' }}>Загрузка данных из базы...</p>
                </div>
              ) : tradingSubdivisions.length === 0 ? (
                <Alert
                  message="Нет торговых подразделений"
                  description="Создайте торговые подразделения для работы с планом продаж."
                  type="warning"
                  showIcon
                />
              ) : finishedProducts.length === 0 ? (
                <Alert
                  message="Нет готовой продукции"
                  description="Добавьте готовую продукцию для работы с планом продаж."
                  type="warning"
                  showIcon
                />
              ) : (
                <Alert
                  message="Данные не найдены"
                  description={`План продаж за ${year} год не найден в базе данных. Нажмите "Редактировать план" для создания нового плана.`}
                  type="info"
                  showIcon
                />
              )}
            </div>
          )}
        </Spin>
        
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
          <Text type="secondary">
            {isEditing ? (
              <>
                <strong>Режим редактирования:</strong> Внесите изменения в ячейки, затем нажмите "Сохранить изменения". 
                Изменения не сохраняются автоматически.
              </>
            ) : (
              <>
                <strong>Режим просмотра:</strong> Данные загружены из базы данных. Для внесения изменений нажмите кнопку "Редактировать план".
              </>
            )}
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default SalesPlanPage;