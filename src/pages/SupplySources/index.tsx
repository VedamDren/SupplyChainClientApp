import React, { useState, useEffect } from 'react';
import {
  Table,
  Select,
  Modal,
  message,
  Card,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { request } from '@umijs/max';
import type { SupplySourceMatrixItem } from '@/models/supplySource';
import type { SubdivisionDto } from '@/models/subdivision';
import type { MaterialDto } from '@/models/material';

const { Option } = Select;

const SupplySourcesPage: React.FC = () => {
  const [data, setData] = useState<SupplySourceMatrixItem[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const [productionSubdivisions, setProductionSubdivisions] = useState<SubdivisionDto[]>([]);
  const [tradingSubdivisions, setTradingSubdivisions] = useState<SubdivisionDto[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<MaterialDto[]>([]);
  const [editingCell, setEditingCell] = useState<{
    destinationSubdivisionId: number;
    materialId: number;
    monthKey: string;
  } | null>(null);
  const [selectedSource, setSelectedSource] = useState<number>();

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    try {
      const [matrixResponse, productionSubs, tradingSubs, products] = await Promise.all([
        request<{ data: SupplySourceMatrixItem[]; months: string[] }>('/api/SupplySources/matrix', {
          method: 'GET',
          params: { year },
        }),
        request<SubdivisionDto[]>('/api/Subdivisions', {
          method: 'GET',
          params: { type: 'Production' },
        }),
        request<SubdivisionDto[]>('/api/Subdivisions', {
          method: 'GET',
          params: { type: 'Trading' },
        }),
        request<MaterialDto[]>('/api/Materials', {
          method: 'GET',
          params: { type: 'FinishedProduct' },
        }),
      ]);

      setData(matrixResponse.data || []);
      setMonths(matrixResponse.months || []);
      setProductionSubdivisions(productionSubs || []);
      setTradingSubdivisions(tradingSubs || []);
      setFinishedProducts(products || []);
    } catch (error: unknown) {
      message.error('Ошибка загрузки данных');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year]);

  // Обработчик клика по ячейке
  const handleCellClick = (record: SupplySourceMatrixItem, monthKey: string) => {
    setEditingCell({
      destinationSubdivisionId: record.destinationSubdivisionId,
      materialId: record.materialId,
      monthKey
    });
    
    // Устанавливаем текущее значение
    const currentSourceName = record.monthlySources[monthKey];
    const currentSource = productionSubdivisions.find(s => s.name === currentSourceName);
    setSelectedSource(currentSource?.id);
  };

  // Сохранение изменений
  const handleSave = async () => {
    if (!editingCell) return;

    try {
      // Правильно определяем номер месяца из monthKey (формат "2023-01")
      const monthNumber = parseInt(editingCell.monthKey.split('-')[1], 10);

      if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        message.error('Ошибка определения номера месяца');
        return;
      }

      await request('/api/SupplySources/updateMonthly', {
        method: 'POST',
        data: {
          destinationSubdivisionId: editingCell.destinationSubdivisionId,
          materialId: editingCell.materialId,
          year: year,
          month: monthNumber,
          sourceSubdivisionId: selectedSource
        },
      });

      message.success('Источник поставки обновлен');
      
      // Обновляем локальные данные
      setData(prevData => 
        prevData.map(item => {
          if (item.destinationSubdivisionId === editingCell.destinationSubdivisionId && 
              item.materialId === editingCell.materialId) {
            const newMonthlySources = { ...item.monthlySources };
            const selectedSubdivision = productionSubdivisions.find(s => s.id === selectedSource);
            newMonthlySources[editingCell.monthKey] = selectedSubdivision?.name || 'Не назначено';
            return { ...item, monthlySources: newMonthlySources };
          }
          return item;
        })
      );

      setEditingCell(null);
    } catch (error: unknown) {
      message.error('Ошибка при обновлении источника поставки');
      console.error('Error updating supply source:', error);
    }
  };

  // Создаем колонки для таблицы
  const columns: ColumnsType<SupplySourceMatrixItem> = [
    {
      title: 'Торговое подразделение',
      dataIndex: 'destinationSubdivisionName',
      key: 'destinationSubdivisionName',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      fixed: 'left' as const,
      width: 150,
    },
    ...months.map((month, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
      return {
        title: month,
        key: monthKey,
        width: 120,
        render: (_: any, record: SupplySourceMatrixItem) => {
          const sourceName = record.monthlySources[monthKey] || 'Не назначено';
          return (
            <div
              style={{
                padding: '8px',
                cursor: 'pointer',
                backgroundColor: sourceName === 'Не назначено' ? '#fff3cd' : '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '4px',
                textAlign: 'center',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => handleCellClick(record, monthKey)}
            >
              {sourceName}
            </div>
          );
        },
      };
    }),
  ];

  // Получаем отображаемое название месяца для модального окна
  const getMonthDisplayName = (monthKey: string): string => {
    const monthNumber = parseInt(monthKey.split('-')[1], 10);
    return months[monthNumber - 1] || monthKey;
  };

  return (
    <div>
      <Card 
        title="Источники поставок" 
        extra={
          <Select value={year} onChange={setYear} style={{ width: 120 }}>
            <Option value={2023}>2023</Option>
            <Option value={2024}>2024</Option>
            <Option value={2025}>2025</Option>
          </Select>
        }
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            scroll={{ x: 1500 }}
            pagination={false}
            rowKey={(record) => `${record.destinationSubdivisionId}-${record.materialId}`}
          />
        </Spin>
      </Card>

      {/* Модальное окно редактирования */}
      <Modal
        title="Выбор источника поставки"
        open={!!editingCell}
        onOk={handleSave}
        onCancel={() => setEditingCell(null)}
        okText="Сохранить"
        cancelText="Отмена"
      >
        {editingCell && (
          <div style={{ marginBottom: 16 }}>
            <p>
              <strong>Торговое подразделение:</strong>{' '}
              {tradingSubdivisions.find(s => s.id === editingCell.destinationSubdivisionId)?.name}
            </p>
            <p>
              <strong>Материал:</strong>{' '}
              {finishedProducts.find(m => m.id === editingCell.materialId)?.name}
            </p>
            <p>
              <strong>Месяц:</strong>{' '}
              {getMonthDisplayName(editingCell.monthKey)}
            </p>
          </div>
        )}

        <Select
          style={{ width: '100%' }}
          placeholder="Выберите производственное подразделение"
          value={selectedSource}
          onChange={setSelectedSource}
        >
          <Option value={undefined}>Не назначено</Option>
          {productionSubdivisions.map(subdivision => (
            <Option key={subdivision.id} value={subdivision.id}>
              {subdivision.name}
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default SupplySourcesPage;