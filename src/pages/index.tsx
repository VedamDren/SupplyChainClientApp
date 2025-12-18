import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Button } from 'antd';
import { 
  DatabaseOutlined, 
  TeamOutlined, 
  ShoppingOutlined, 
  LineChartOutlined,
  AppstoreOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { history } from 'umi';
import { isAuthenticated } from '@/services/authService';

const { Title, Text } = Typography;

const HomePage: React.FC = () => {
  useEffect(() => {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!isAuthenticated()) {
      history.push('/login');
    }
  }, []);

  const navigateTo = (path: string) => {
    history.push(path);
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        Добро пожаловать в систему управления цепочками поставок
      </Title>
      
      <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
        Используйте меню слева для навигации по разделам системы
      </Text>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable onClick={() => navigateTo('/materials')}>
            <Statistic
              title="Материалы"
              value={0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable onClick={() => navigateTo('/subdivision')}>
            <Statistic
              title="Подразделения"
              value={0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable onClick={() => navigateTo('/salesPlan')}>
            <Statistic
              title="План продаж"
              value={0}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable onClick={() => navigateTo('/productionPlan')}>
            <Statistic
              title="План производства"
              value={0}
              prefix={<LineChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Быстрый доступ">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                //type="primary" 
                icon={<AppstoreOutlined />} 
                block 
                onClick={() => navigateTo('/SalesPlan')}
                size="large"
                style={{ textAlign: 'left' }}
              >
                Управление планом продаж
              </Button>
              <Button 
                //type="primary"
                icon={<TeamOutlined />} 
                block 
                onClick={() => navigateTo('/SupplySources')}
                size="large"
                style={{ textAlign: 'left' }}
              >
                Управление источниками поставок
              </Button>
              <Button 
                //type="primary"
                icon={<SettingOutlined />} 
                block 
                onClick={() => navigateTo('/regulations')}
                size="large"
                style={{ textAlign: 'left' }}
              >
                Управление нормативами
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;