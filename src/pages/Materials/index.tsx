import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Space,
} from 'antd';
import type { TableProps } from 'antd';
import { request } from '@umijs/max';
import type { MaterialDto } from '@/models/material';
import { MaterialType, MaterialTypeLabels } from '@/models/material';

const MaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialDto | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await request<MaterialDto[]>('/api/Materials', {
        method: 'GET',
      });
      setMaterials(data);
    } catch (error: unknown) {
      message.error('Ошибка при загрузке материалов');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
    form.resetFields();
  };

  const handleEdit = (record: MaterialDto) => {
    setEditingMaterial(record);
    form.setFieldsValue({
      Name: record.name,
      Type: record.type,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/Materials/${id}`, {
        method: 'DELETE',
      });
      message.success('Материал удален');
      loadMaterials();
    } catch (error: unknown) {
      message.error('Ошибка при удалении материала');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // Подготавливаем данные для сервера с правильными именами полей
      const requestData = {
        Name: values.Name,
        Type: values.Type, // Теперь это строка, не нужно преобразовывать в число
      };

      if (editingMaterial) {
        await request(`/api/Materials/${editingMaterial.id}`, {
          method: 'PUT',
          data: requestData,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        message.success('Материал обновлен');
      } else {
        await request<MaterialDto>('/api/Materials', {
          method: 'POST',
          data: requestData,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        message.success('Материал создан');
      }
      setIsModalOpen(false);
      loadMaterials();
    } catch (error: unknown) {
      let errorMessage = 'Ошибка при сохранении материала';
      
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response: { data: string } };
        errorMessage = err.response?.data || errorMessage;
      }
      
      message.error(errorMessage);
    }
  };

  const columns: TableProps<MaterialDto>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => MaterialTypeLabels[type as keyof typeof MaterialTypeLabels],
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить материал?"
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
      <Button
        type="primary"
        onClick={handleAdd}
        style={{ marginBottom: 16 }}
      >
        Добавить материал
      </Button>

      <Table
        columns={columns}
        dataSource={materials}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingMaterial ? 'Редактирование материала' : 'Новый материал'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="Name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="Type"
            label="Тип"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select>
              <Select.Option value={MaterialType.FinishedProduct}>
                {MaterialTypeLabels[MaterialType.FinishedProduct]}
              </Select.Option>
              <Select.Option value={MaterialType.RawMaterial}>
                {MaterialTypeLabels[MaterialType.RawMaterial]}
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingMaterial ? 'Обновить' : 'Создать'}
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

export default MaterialsPage;