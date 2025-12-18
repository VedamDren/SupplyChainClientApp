import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Row, Col, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { register, RegisterParams, isAuthenticated } from '@/services/authService';
import { history } from 'umi';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // Если пользователь уже авторизован, перенаправляем на главную
    if (isAuthenticated()) {
      history.push('/');
    }
  }, []);

  const onFinish = async (values: RegisterParams) => {
    setLoading(true);
    try {
      const response = await register(values);
      if (response.status === 0) {
        message.success('Регистрация выполнена успешно');
        // Очищаем форму
        form.resetFields();
        // Перенаправляем на страницу входа
        setTimeout(() => {
          history.push('/login');
        }, 1500);
      } else {
        message.error(response.message || 'Ошибка регистрации');
      }
    } catch (error: any) {
      // Ошибка уже обработана в request интерцепторе
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Пожалуйста, введите пароль!'));
    }
    if (value.length < 6) {
      return Promise.reject(new Error('Пароль должен содержать минимум 6 символов!'));
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = ({ getFieldValue }: any) => ({
    validator(_: any, value: string) {
      if (!value || getFieldValue('password') === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('Пароли не совпадают!'));
    },
  });

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

  const registerButtonStyle = {
    height: '48px',
    fontWeight: 600,
    borderRadius: '8px',
    marginTop: '10px',
  };

  const loginLinkStyle = {
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
              Регистрация нового пользователя
            </Text>
          </div>
          
          <Card style={cardStyle} bordered={true}>
            <Form
              form={form}
              name="register"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="login"
                label="Логин"
                rules={[
                  { required: true, message: 'Пожалуйста, введите логин!' },
                  { min: 3, message: 'Логин должен содержать минимум 3 символа!' },
                  { max: 50, message: 'Логин не должен превышать 50 символов!' }
                ]}
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
                rules={[
                  { required: true, message: 'Пожалуйста, введите пароль!' },
                  { validator: validatePassword }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="Введите пароль" 
                  size="large"
                />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="Подтверждение пароля"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Пожалуйста, подтвердите пароль!' },
                  validateConfirmPassword
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="Подтвердите пароль" 
                  size="large"
                />
              </Form.Item>
              
              <Form.Item
                name="name"
                label="Имя (необязательно)"
                rules={[{ max: 100, message: 'Имя не должно превышать 100 символов!' }]}
              >
                <Input 
                  prefix={<MailOutlined />} 
                  placeholder="Введите ваше имя" 
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
                  style={registerButtonStyle}
                >
                  Зарегистрироваться
                </Button>
              </Form.Item>
              
              <Form.Item style={loginLinkStyle}>
                <Button 
                  type="link" 
                  block 
                  onClick={() => history.push('/login')}
                  size="large"
                >
                  Уже есть аккаунт? Войти
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

export default RegisterPage;