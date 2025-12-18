import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Select,
  message,
  Space,
  Alert,
  Row,
  Col,
  Descriptions,
  Statistic,
} from 'antd';
import {
  CalculatorOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import TransferPlanService from '@/services/transferPlan';

const { Option } = Select;

const TransferPlanPage: React.FC = () => {
  const [transferPlans, setTransferPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [calculationModalVisible, setCalculationModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [calculationForm] = Form.useForm();
  const [selectedTransferPlan, setSelectedTransferPlan] = useState<any>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(moment().year());

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await TransferPlanService.getAllTransferPlans();
      setTransferPlans(data);
    } catch (error) {
      console.error('Error loading transfer plans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтруем планы по году
  const filteredPlans = transferPlans.filter(plan => 
    moment(plan.transferDate).year() === selectedYear
  );

  // Удаление плана
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: 'Удалить план перемещения?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await TransferPlanService.deleteTransferPlan(id);
          loadData(); // Перезагружаем данные
        } catch (error) {
          // Ошибка уже обработана в сервисе
        }
      },
    });
  };

  // Расчет годового плана
  const handleCalculate = async () => {
    try {
      const values = await calculationForm.validateFields();
      const year = values.year;
      
      setCalculationLoading(true);
      setCalculationResult(null);

      const result = await TransferPlanService.calculateYearlyTransferPlan(year);
      setCalculationResult(result);
      
      if (result.success) {
        // Перезагружаем данные после расчета
        await loadData();
      }
      
      setCalculationModalVisible(false);
    } catch (error) {
      console.error('Error calculating transfer plan:', error);
    } finally {
      setCalculationLoading(false);
    }
  };

  // Просмотр деталей
  const showDetailModal = (record: any) => {
    setSelectedTransferPlan(record);
    setDetailModalVisible(true);
  };

  // Экспорт
  const handleExport = () => {
    // Здесь будет логика экспорта
    message.info('Функция экспорта в разработке');
  };

  // Колонки таблицы
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Источник',
      dataIndex: 'sourceSubdivisionName',
      key: 'sourceSubdivisionName',
      render: (text: string) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
          {text || 'Не указан'}
        </span>
      ),
    },
    {
      title: 'Получатель',
      dataIndex: 'destinationSubdivisionName',
      key: 'destinationSubdivisionName',
      render: (text: string) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
          {text || 'Не указан'}
        </span>
      ),
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
    },
    {
      title: 'Месяц',
      dataIndex: 'transferDate',
      key: 'transferDate',
      render: (date: string) => (
        <span style={{ fontWeight: 'bold' }}>
          {moment(date).format('MMMM YYYY')}
        </span>
      ),
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (quantity: number) => (
        <span style={{ 
          fontWeight: 'bold',
          color: quantity > 0 ? '#3f8600' : '#cf1322'
        }}>
          {quantity.toLocaleString('ru-RU')}
        </span>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showDetailModal(record)}
            size="small"
          >
            Детали
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            size="small"
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  // Генерация списка лет
  const yearOptions = [];
  const currentYear = moment().year();
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    yearOptions.push(i);
  }

  return (
    <div>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Планы перемещений</span>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 120 }}
            >
              {yearOptions.map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
          </div>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={() => setCalculationModalVisible(true)}
            >
              Рассчитать на год
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Экспорт
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              Обновить
            </Button>
          </Space>
        }
      >
        <Alert
          message={`Отображены планы перемещений за ${selectedYear} год`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Table
          columns={columns}
          dataSource={filteredPlans}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} записей`,
          }}
        />
      </Card>

      {/* Модальное окно расчета */}
      <Modal
        title="Расчет плана перемещений на год"
        open={calculationModalVisible}
        onOk={handleCalculate}
        onCancel={() => {
          setCalculationModalVisible(false);
          setCalculationResult(null);
        }}
        confirmLoading={calculationLoading}
        width={600}
      >
        <Alert
          message="Внимание!"
          description="При расчете будут удалены существующие планы перемещений за выбранный год и созданы новые на основе актуальных данных."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form form={calculationForm} layout="vertical">
          <Form.Item
            name="year"
            label="Год для расчета"
            initialValue={selectedYear}
            rules={[{ required: true, message: 'Выберите год' }]}
          >
            <Select placeholder="Выберите год">
              {yearOptions.map(year => (
                <Option key={year} value={year}>{year} год</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>

        {calculationResult && (
          <Card style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Год"
                  value={calculationResult.year}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Количество планов"
                  value={calculationResult.plansCount}
                />
              </Col>
            </Row>
            <Alert
              message={calculationResult.message}
              type={calculationResult.success ? 'success' : 'error'}
              style={{ marginTop: 16 }}
            />
          </Card>
        )}
      </Modal>

      {/* Модальное окно деталей */}
      <Modal
        title="Детали плана перемещения"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Закрыть
          </Button>,
        ]}
        width={500}
      >
        {selectedTransferPlan && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">
              {selectedTransferPlan.id}
            </Descriptions.Item>
            <Descriptions.Item label="Источник">
              <strong>{selectedTransferPlan.sourceSubdivisionName}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Получатель">
              <strong>{selectedTransferPlan.destinationSubdivisionName}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Материал">
              {selectedTransferPlan.materialName}
            </Descriptions.Item>
            <Descriptions.Item label="Дата">
              {moment(selectedTransferPlan.transferDate).format('DD.MM.YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Месяц">
              {moment(selectedTransferPlan.transferDate).format('MMMM YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Количество">
              <strong>{selectedTransferPlan.quantity.toLocaleString('ru-RU')}</strong>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default TransferPlanPage;