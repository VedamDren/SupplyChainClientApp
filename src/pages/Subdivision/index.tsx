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
import type { SubdivisionDto } from '@/models/subdivision';
import { SubdivisionType, SubdivisionTypeLabels } from '@/models/subdivision';

const SubdivisionsPage: React.FC = () => {
  const [subdivisions, setSubdivisions] = useState<SubdivisionDto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubdivision, setEditingSubdivision] = useState<SubdivisionDto | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubdivisions();
  }, []);

  const loadSubdivisions = async () => {
    try {
      setLoading(true);
      const data = await request<SubdivisionDto[]>('/api/Subdivisions/getAll', {
        method: 'POST',
      });
      setSubdivisions(data);
    } catch (error: unknown) {
      message.error('Ошибка при загрузке подразделений');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSubdivision(null);
    setIsModalOpen(true);
    form.resetFields();
  };

  const handleEdit = (record: SubdivisionDto) => {
    setEditingSubdivision(record);
    form.setFieldsValue({
      Name: record.name,
      Type: record.type,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/Subdivisions/${id}`, {
        method: 'DELETE',
      });
      message.success('Подразделение удалено');
      loadSubdivisions();
    } catch (error: unknown) {
      message.error('Ошибка при удалении подразделения');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // Правильный формат данных для сервера
      const requestData = {
        Name: values.Name,
        Type: values.Type, // Отправляем строку как есть
      };

      if (editingSubdivision) {
        await request(`/api/Subdivisions/${editingSubdivision.id}`, {
          method: 'PUT',
          data: requestData,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        message.success('Подразделение обновлено');
      } else {
        await request<SubdivisionDto>('/api/Subdivisions', {
          method: 'POST',
          data: requestData,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        message.success('Подразделение создано');
      }
      setIsModalOpen(false);
      loadSubdivisions();
    } catch (error: unknown) {
      let errorMessage = 'Ошибка при сохранении подразделения';
      
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response: { data: string } };
        errorMessage = err.response?.data || errorMessage;
      }
      
      message.error(errorMessage);
    }
  };

  const columns: TableProps<SubdivisionDto>['columns'] = [
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
      render: (type: string) => SubdivisionTypeLabels[type as keyof typeof SubdivisionTypeLabels],
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
            title="Удалить подразделение?"
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
        Добавить подразделение
      </Button>

      <Table
        columns={columns}
        dataSource={subdivisions}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingSubdivision ? 'Редактирование подразделения' : 'Новое подразделение'}
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
              <Select.Option value={SubdivisionType.Trading}>
                {SubdivisionTypeLabels[SubdivisionType.Trading]}
              </Select.Option>
              <Select.Option value={SubdivisionType.Production}>
                {SubdivisionTypeLabels[SubdivisionType.Production]}
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSubdivision ? 'Обновить' : 'Создать'}
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

export default SubdivisionsPage;