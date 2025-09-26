import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Space,
  Card,
} from 'antd';
import type { TableProps } from 'antd';
import { request } from '@umijs/max';
import type { TechnologicalCardDto } from '@/models/technologicalCard';
import type { SubdivisionDto } from '@/models/subdivision';
import type { MaterialDto } from '@/models/material';
import { 
  getProductionSubdivisions, 
  getFinishedProducts, 
  getRawMaterials 
} from '@/services/technologicalCard';

const { Option } = Select;

const TechnologicalCardsPage: React.FC = () => {
  const [technologicalCards, setTechnologicalCards] = useState<TechnologicalCardDto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TechnologicalCardDto | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [productionSubdivisions, setProductionSubdivisions] = useState<SubdivisionDto[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<MaterialDto[]>([]);
  const [rawMaterials, setRawMaterials] = useState<MaterialDto[]>([]);

  useEffect(() => {
    loadTechnologicalCards();
    loadDropdownData();
  }, []);

  const loadTechnologicalCards = async () => {
    try {
      setLoading(true);
      const data = await request<TechnologicalCardDto[]>('/api/TechnologicalCards/getAll', {
        method: 'POST',
      });
      setTechnologicalCards(data);
    } catch (error: unknown) {
      message.error('Ошибка при загрузке технологических карт');
      console.error('Error loading technological cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [subdivisions, finishedProds, rawMats] = await Promise.all([
        getProductionSubdivisions(),
        getFinishedProducts(),
        getRawMaterials(),
      ]);

      setProductionSubdivisions(subdivisions);
      setFinishedProducts(finishedProds);
      setRawMaterials(rawMats);
    } catch (error: unknown) {
      message.error('Ошибка при загрузке данных для выпадающих списков');
      console.error('Error loading dropdown data:', error);
    }
  };

  const handleAdd = () => {
    setEditingCard(null);
    setIsModalOpen(true);
    form.resetFields();
  };

  const handleEdit = (record: TechnologicalCardDto) => {
    setEditingCard(record);
    form.setFieldsValue({
      SubdivisionId: record.subdivisionId,
      FinishedProductId: record.finishedProductId,
      RawMaterialId: record.rawMaterialId,
      RawMaterialPerUnit: record.rawMaterialPerUnit,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/TechnologicalCards/${id}`, {
        method: 'DELETE',
      });
      message.success('Технологическая карта удалена');
      loadTechnologicalCards();
    } catch (error: unknown) {
      message.error('Ошибка при удалении технологической карты');
      console.error('Error deleting technological card:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const requestData = {
        SubdivisionId: values.SubdivisionId,
        FinishedProductId: values.FinishedProductId,
        RawMaterialId: values.RawMaterialId,
        RawMaterialPerUnit: values.RawMaterialPerUnit,
      };

      if (editingCard) {
        await request(`/api/TechnologicalCards/${editingCard.id}`, {
          method: 'PUT',
          data: requestData,
        });
        message.success('Технологическая карта обновлена');
      } else {
        await request<TechnologicalCardDto>('/api/TechnologicalCards', {
          method: 'POST',
          data: requestData,
        });
        message.success('Технологическая карта создана');
      }
      setIsModalOpen(false);
      loadTechnologicalCards();
    } catch (error: unknown) {
      let errorMessage = 'Ошибка при сохранении технологической карты';
      
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response: { data: string } };
        errorMessage = err.response?.data || errorMessage;
      }
      
      message.error(errorMessage);
      console.error('Error saving technological card:', error);
    }
  };

  // Функции для получения названий по ID
  const getSubdivisionName = (subdivisionId: number) => {
    const subdivision = productionSubdivisions.find(s => s.id === subdivisionId);
    return subdivision?.name || `ID: ${subdivisionId}`;
  };

  const getFinishedProductName = (finishedProductId: number) => {
    const product = finishedProducts.find(p => p.id === finishedProductId);
    return product?.name || `ID: ${finishedProductId}`;
  };

  const getRawMaterialName = (rawMaterialId: number) => {
    const material = rawMaterials.find(m => m.id === rawMaterialId);
    return material?.name || `ID: ${rawMaterialId}`;
  };

  const columns: TableProps<TechnologicalCardDto>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Подразделение',
      dataIndex: 'subdivisionId',
      key: 'subdivisionId',
      render: (subdivisionId: number) => getSubdivisionName(subdivisionId),
    },
    {
      title: 'Готовая продукция',
      dataIndex: 'finishedProductId',
      key: 'finishedProductId',
      render: (finishedProductId: number) => getFinishedProductName(finishedProductId),
    },
    {
      title: 'Сырьё',
      dataIndex: 'rawMaterialId',
      key: 'rawMaterialId',
      render: (rawMaterialId: number) => getRawMaterialName(rawMaterialId),
    },
    {
      title: 'Сырьё на единицу',
      dataIndex: 'rawMaterialPerUnit',
      key: 'rawMaterialPerUnit',
      render: (value: number) => `${value} ед.`,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить технологическую карту?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="Технологические карты">
        <Button
          type="primary"
          onClick={handleAdd}
          style={{ marginBottom: 16 }}
        >
          Добавить технологическую карту
        </Button>

        <Table
          columns={columns}
          dataSource={technologicalCards}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={editingCard ? 'Редактирование технологической карты' : 'Новая технологическая карта'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="SubdivisionId"
            label="Производственное подразделение"
            rules={[{ required: true, message: 'Выберите подразделение' }]}
          >
            <Select placeholder="Выберите производственное подразделение">
              {productionSubdivisions.map(subdivision => (
                <Option key={subdivision.id} value={subdivision.id}>
                  {subdivision.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="FinishedProductId"
            label="Готовая продукция"
            rules={[{ required: true, message: 'Выберите готовую продукцию' }]}
          >
            <Select placeholder="Выберите готовую продукцию">
              {finishedProducts.map(product => (
                <Option key={product.id} value={product.id}>
                  {product.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="RawMaterialId"
            label="Сырьё"
            rules={[{ required: true, message: 'Выберите сырьё' }]}
          >
            <Select placeholder="Выберите сырьё">
              {rawMaterials.map(material => (
                <Option key={material.id} value={material.id}>
                  {material.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="RawMaterialPerUnit"
            label="Количество сырья на единицу продукции"
            rules={[
              { required: true, message: 'Введите количество' },
              { type: 'number', min: 1, message: 'Количество должно быть положительным' }
            ]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="Введите количество сырья на единицу продукции"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCard ? 'Обновить' : 'Создать'}
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TechnologicalCardsPage;