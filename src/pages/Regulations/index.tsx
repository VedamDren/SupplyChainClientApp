import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Space,
} from 'antd';
import type { TableProps } from 'antd';
import { request } from '@umijs/max';
import type { RegulationDto } from '@/models/regulation';
import type { MaterialDto } from '@/models/material';
import type { SubdivisionDto } from '@/models/subdivision';
import dayjs from 'dayjs';

const { Option } = Select;

const RegulationsPage: React.FC = () => {
  const [regulations, setRegulations] = useState<RegulationDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [subdivisions, setSubdivisions] = useState<SubdivisionDto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegulation, setEditingRegulation] = useState<RegulationDto | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRegulations();
    loadMaterials();
    loadSubdivisions();
  }, []);

  const loadRegulations = async () => {
    try {
      setLoading(true);
      const data = await request<RegulationDto[]>('/api/Regulations/getAll', {
        method: 'POST',
      });
      setRegulations(data);
    } catch (error: unknown) {
      message.error('Ошибка при загрузке нормативов');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async () => {
    try {
      const data = await request<MaterialDto[]>('/api/Materials/getAll', {
        method: 'POST',
      });
      setMaterials(data);
    } catch (error: unknown) {
      message.error('Ошибка при загрузке материалов');
    }
  };

  const loadSubdivisions = async () => {
    try {
      const data = await request<SubdivisionDto[]>('/api/Subdivisions/getAll', {
        method: 'POST',
      });
      setSubdivisions(data);
    } catch (error: unknown) {
      message.error('Ошибка при загрузке подразделений');
    }
  };

  const handleAdd = () => {
    setEditingRegulation(null);
    setIsModalOpen(true);
    form.resetFields();
  };

  const handleEdit = (record: RegulationDto) => {
    console.log('Editing record:', record); // Отладка
    
    // Проверяем, что record не пустой и содержит необходимые данные
    if (!record || !record.id) {
      message.error('Не удалось загрузить данные для редактирования');
      return;
    }
    
    setEditingRegulation(record);
    
    // Используем setTimeout для гарантии, что форма уже отрендерена
    setTimeout(() => {
      try {
        form.setFieldsValue({
          SubdivisionId: record.subdivisionId,
          MaterialId: record.materialId,
          Date: record.date ? dayjs(record.date) : null,
          DaysCount: record.daysCount,
        });
      } catch (error) {
        console.error('Error setting form values:', error);
        message.error('Ошибка при загрузке данных для редактирования');
      }
    }, 0);
    
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/Regulations/${id}`, {
        method: 'DELETE',
      });
      message.success('Норматив удален');
      loadRegulations();
    } catch (error: unknown) {
      message.error('Ошибка при удалении норматива');
    }
  };

  const handleSubmit = async (values: any) => {
    console.log('Form values:', values);
    
    try {
      // Проверяем, что все обязательные поля заполнены
      if (!values.SubdivisionId || !values.MaterialId || !values.Date || !values.DaysCount) {
        message.error('Заполните все обязательные поля');
        return;
      }

      // Преобразуем DaysCount в число
      const daysCount = Number(values.DaysCount);
      
      // Правильное форматирование даты с использованием dayjs
      const formattedDate = values.Date ? values.Date.format('YYYY-MM-DD') : null;
      
      const requestData = {
        SubdivisionId: Number(values.SubdivisionId),
        MaterialId: Number(values.MaterialId),
        Date: formattedDate,
        DaysCount: daysCount,
      };

      console.log('Sending data:', requestData);

      if (editingRegulation) {
        // Для редактирования используем правильный endpoint
        await request(`/api/Regulations/${editingRegulation.id}`, {
          method: 'PUT',
          data: requestData,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        message.success('Норматив обновлен');
      } else {
        await request<RegulationDto>('/api/Regulations', {
          method: 'POST',
          data: requestData,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        message.success('Норматив создан');
      }
      
      setIsModalOpen(false);
      form.resetFields();
      setEditingRegulation(null);
      loadRegulations();
    } catch (error: unknown) {
      console.error('Error saving regulation:', error);
      
      let errorMessage = 'Ошибка при сохранении норматива';
      
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { 
          response: { 
            data: string | { message?: string } 
          } 
        };
        
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
          errorMessage = err.response.data.message || errorMessage;
        }
      }
      
      message.error(errorMessage);
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указана';
    try {
      return dayjs(dateString).format('MM.YYYY');
    } catch (e) {
      return dateString;
    }
  };

  // Валидатор для проверки положительного числа
  const validateDaysCount = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Введите количество дней'));
    }
    
    const numberValue = Number(value);
    if (isNaN(numberValue)) {
      return Promise.reject(new Error('Введите корректное число'));
    }
    if (numberValue <= 0) {
      return Promise.reject(new Error('Количество дней должно быть положительным'));
    }
    if (!Number.isInteger(numberValue)) {
      return Promise.reject(new Error('Количество дней должно быть целым числом'));
    }
    return Promise.resolve();
  };

  const columns: TableProps<RegulationDto>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Подразделение',
      dataIndex: 'subdivisionId',
      key: 'subdivision',
      render: (subdivisionId, record) => {
        if (record.subdivision) {
          return record.subdivision.name;
        }
        const subdivision = subdivisions.find(s => s.id === subdivisionId);
        return subdivision ? subdivision.name : `ID: ${subdivisionId}`;
      },
    },
    {
      title: 'Материал',
      dataIndex: 'materialId',
      key: 'material',
      render: (materialId, record) => {
        if (record.material) {
          return record.material.name;
        }
        const material = materials.find(m => m.id === materialId);
        return material ? material.name : `ID: ${materialId}`;
      },
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Дней',
      dataIndex: 'daysCount',
      key: 'daysCount',
      width: 80,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            onClick={(e) => {
              e.preventDefault(); // Предотвращаем поведение по умолчанию
              e.stopPropagation(); // Останавливаем всплытие
              handleEdit(record);
            }}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить норматив?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button 
              type="link" 
              danger
              onClick={(e) => {
                e.preventDefault(); // Предотвращаем поведение по умолчанию
                e.stopPropagation(); // Останавливаем всплытие
              }}
            >
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
        Добавить норматив
      </Button>

      <Table
        columns={columns}
        dataSource={regulations}
        rowKey="id"
        loading={loading}
        scroll={{ x: 800 }}
        onRow={(record) => {
          return {
            onClick: () => {
              // Обработчик клика по строке, если нужно
            },
          };
        }}
      />

      <Modal
        title={editingRegulation ? 'Редактирование норматива' : 'Новый норматив'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingRegulation(null);
        }}
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
            label="Подразделение"
            rules={[{ required: true, message: 'Выберите подразделение' }]}
          >
            <Select placeholder="Выберите подразделение">
              {subdivisions.map(subdivision => (
                <Option key={subdivision.id} value={subdivision.id}>
                  {subdivision.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="MaterialId"
            label="Материал"
            rules={[{ required: true, message: 'Выберите материал' }]}
          >
            <Select placeholder="Выберите материал">
              {materials.map(material => (
                <Option key={material.id} value={material.id}>
                  {material.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="Date"
            label="Дата (месяц)"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker 
              picker="month" 
              format="MM.YYYY"
              style={{ width: '100%' }}
              placeholder="Выберите месяц"
            />
          </Form.Item>

          <Form.Item
            name="DaysCount"
            label="Количество дней"
            rules={[
              { validator: validateDaysCount }
            ]}
          >
            <Input 
              type="number" 
              placeholder="Введите количество дней" 
              min={1}
              step={1}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRegulation ? 'Обновить' : 'Создать'}
              </Button>
              <Button onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
                setEditingRegulation(null);
              }}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RegulationsPage;