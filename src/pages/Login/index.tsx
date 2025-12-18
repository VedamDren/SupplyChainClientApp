import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Row, Col, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login, LoginParams, isAuthenticated } from '@/services/authService';
import { history } from 'umi';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Если пользователь уже авторизован, перенаправляем на главную
    if (isAuthenticated()) {
      history.push('/');
    }
  }, []);

  const onFinish = async (values: LoginParams) => {
    setLoading(true);
    try {
      const response = await login(values);
      if (response.status === 0 && response.token) {
        // Сохраняем токен и информацию о пользователе
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify({ 
          login: response.login, 
          userId: response.userId 
        }));
        message.success('Вход выполнен успешно');
        history.push('/'); // Перенаправляем на главную
      } else {
        message.error(response.message || 'Ошибка входа');
      }
    } catch (error: any) {
      // Ошибка уже обработана в request интерцепторе
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    background: 'linear-gradient(135deg, #62ca67ff 0%, #6280beff 100%)',
    minHeight: '100vh',
    padding: '20px',
  };

  const logoContainerStyle = {
    textAlign: 'center' as 'center',
    marginBottom: '30px',
  };

  const titleStyle = {
    color: 'white',
    marginBottom: '8px',
  };

  const subtitleStyle = {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '16px',
  };

  const cardStyle = {
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    border: 'none',
  };

  const loginButtonStyle = {
    height: '48px',
    fontWeight: 600,
    borderRadius: '8px',
    marginTop: '10px',
  };

  const registerLinkStyle = {
    marginBottom: 0,
    textAlign: 'center' as 'center',
  };

  const footerStyle = {
    textAlign: 'center' as 'center',
    marginTop: '24px',
    color: 'rgba(255, 255, 255, 0.7)',
  };

  return (
    <div style={containerStyle}>
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <div style={logoContainerStyle}>
            <Title level={2} style={titleStyle}>
              Управление цепочками поставок
            </Title>
            <Text type="secondary" style={subtitleStyle}>
              Вход в систему
            </Text>
          </div>
          
          <Card style={cardStyle} bordered={true}>
            <Form
              name="login"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="login"
                label="Логин"
                rules={[{ required: true, message: 'Пожалуйста, введите логин!' }]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="Введите логин" 
                  size="large"
                />
              </Form.Item>
              
              <Form.Item
                name="password"
                label="Пароль"
                rules={[{ required: true, message: 'Пожалуйста, введите пароль!' }]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="Введите пароль" 
                  size="large"
                />
              </Form.Item>
              
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading} 
                  block
                  size="large"
                  style={loginButtonStyle}
                >
                  Войти
                </Button>
              </Form.Item>
              
              <Form.Item style={registerLinkStyle}>
                <Button 
                  type="link" 
                  block 
                  onClick={() => history.push('/register')}
                  size="large"
                >
                  Нет аккаунта? Зарегистрироваться
                </Button>
              </Form.Item>
            </Form>
          </Card>
          
          <div style={footerStyle}>
            <Text type="secondary">
              Управление цепочками поставок © {new Date().getFullYear()}
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default LoginPage;