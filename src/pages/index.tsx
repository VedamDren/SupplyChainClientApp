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
                onClick={() => navigateTo('/TechnologicalCard')}
                size="large"
                style={{ textAlign: 'left' }}
              >
                Управление технологическими картами
              </Button>
              <Button 
                //type="primary"
                icon={<SettingOutlined />} 
                block 
                onClick={() => navigateTo('/TransferPlan')}
                size="large"
                style={{ textAlign: 'left' }}
              >
                Управление нормативами
              </Button>
                            <Button 
                //type="primary"
                icon={<SettingOutlined />} 
                block 
                onClick={() => navigateTo('/SupplySources')}
                size="large"
                style={{ textAlign: 'left' }}
              >
                Управление источниками поставок
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;