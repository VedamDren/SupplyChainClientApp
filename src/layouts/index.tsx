import React, { useState, useEffect } from 'react';
import {
  FolderOpenOutlined,
  SyncOutlined,
  QuestionOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  SwapOutlined, // Добавили иконку для плана перемещений
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme, Dropdown, Button, Avatar, Modal } from 'antd';
import { history, Outlet, useLocation } from 'umi';
import { isAuthenticated, logout, getUserInfo } from '@/services/authService';

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Получаем текущий путь для выделения пункта меню
  const currentPath = location.pathname;
  const selectedKey = getSelectedKey(currentPath);

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    const authStatus = isAuthenticated();
    setIsAuth(authStatus);
    
    if (authStatus) {
      const user = getUserInfo();
      setUserInfo(user);
    } else {
      // Если не авторизован и не на страницах логина/регистрации, перенаправляем
      if (currentPath !== '/login' && currentPath !== '/register') {
        history.push('/login');
      }
    }
  }, [currentPath]);

  // Функция для определения ключа меню по пути
  function getSelectedKey(path: string): string {
    const pathMap: Record<string, string> = {
      '/': 'home',
      '/inventoryPlan': '1',
      '/transferPlan': '2',
      '/salesPlan': '3',
      '/productionPlan': '4',
      '/rawMaterialWriteOff': '11',
      '/rawMaterialPurchase': '12',
      '/materials': '9',
      '/subdivision': '10',
      '/regulations': '6',
      '/technologicalCard': '5',
      '/supplySources': '7',
      '/transferPlan/docs': '2', // Документация также относится к плану перемещений
    };
    return pathMap[path] || 'home';
  }

  const handleMenuSelect = ({ key }: { key: string }) => {
    // Навигация по меню
    switch (key) {
      case 'home':
        history.push('/');
        break;
      case '1':
        history.push('/inventoryPlan');
        break;
      case '2':
        history.push('/transferPlan'); // Навигация на план перемещений
        break;
      case '3':
        history.push('/salesPlan');
        break;
      case '4':
        history.push('/productionPlan');
        break;
      case '5':
        history.push('/technologicalCard');
        break;
      case '6':
        history.push('/regulations');
        break;
      case '7':
        history.push('/supplySources');
        break;
      case '9':
        history.push('/materials');
        break;
      case '10':
        history.push('/subdivision');
        break;
      case '11':
        history.push('/rawMaterialWriteOff');
        break;
      case '12':
        history.push('/rawMaterialPurchase');
        break;
      default:
        history.push('/');
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    logout();
    setIsAuth(false);
    setUserInfo(null);
    setLogoutModalVisible(false);
    history.push('/login');
  };

  const cancelLogout = () => {
    setLogoutModalVisible(false);
  };

  // Пункты меню пользователя
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 16px', minWidth: '200px' }}>
          <div style={{ fontWeight: 'bold' }}>{userInfo?.login || 'Пользователь'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>ID: {userInfo?.userId}</div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: handleLogout,
    },
  ];

  // Элементы основного меню - обновляем для плана перемещений
  const items: MenuItem[] = [
    getItem('Планы', 'sub1', <FolderOpenOutlined />, [
      getItem('План запасов', '1'),
      getItem('План перемещений', '2'), //Добавиление иконки для план перемещений <SwapOutlined /> пока что отказался, если придумаю ещё иконки может вернусь к этом
      getItem('План продаж', '3'),
      getItem('План производства', '4'),
      getItem('План списания сырья в производство', '11'),
      getItem('План закупа сырья', '12'),
    ]),
    getItem('Справочники', 'sub2', <QuestionOutlined />, [
      getItem('Материалы', '9'),
      getItem('Подразделения', '10'),
      getItem('Нормативы', '6'),
      getItem('Технологические карты', '5'),
      getItem('Источники поставок', '7') 
    ]),
  ];

  // Функция для получения хлебных крошек - добавляем TransferPlan
  const getBreadcrumbItems = () => {
    const breadcrumbMap: Record<string, { title: string }[]> = {
      '/': [{ title: 'Главная' }],
      '/inventoryPlan': [{ title: 'Планы' }, { title: 'План запасов' }],
      '/transferPlan': [{ title: 'Планы' }, { title: 'План перемещений' }],
      '/transferPlan/docs': [{ title: 'Планы' }, { title: 'План перемещений' }, { title: 'Документация' }],
      '/salesPlan': [{ title: 'Планы' }, { title: 'План продаж' }],
      '/productionPlan': [{ title: 'Планы' }, { title: 'План производства' }],
      '/rawMaterialWriteOff': [{ title: 'Планы' }, { title: 'План списания сырья' }],
      '/rawMaterialPurchase': [{ title: 'Планы' }, { title: 'План закупа сырья' }],
      '/materials': [{ title: 'Справочники' }, { title: 'Материалы' }],
      '/subdivision': [{ title: 'Справочники' }, { title: 'Подразделения' }],
      '/regulations': [{ title: 'Справочники' }, { title: 'Нормативы' }],
      '/technologicalCard': [{ title: 'Справочники' }, { title: 'Технологические карты' }],
      '/supplySources': [{ title: 'Справочники' }, { title: 'Источники поставок' }],
      '/docs': [{ title: 'Документация' }],
    };
    
    return breadcrumbMap[currentPath] || [{ title: 'Главная' }];
  };

  // Функция для получения заголовка страницы - добавляем TransferPlan
  const getPageTitle = () => {
    const titleMap: Record<string, string> = {
      '/': 'Главная',
      '/inventoryPlan': 'План запасов',
      '/transferPlan': 'План перемещений',
      '/transferPlan/docs': 'Документация по плану перемещений',
      '/salesPlan': 'План продаж',
      '/productionPlan': 'План производства',
      '/rawMaterialWriteOff': 'План списания сырья в производство',
      '/rawMaterialPurchase': 'План закупа сырья',
      '/materials': 'Материалы',
      '/subdivision': 'Подразделения',
      '/regulations': 'Нормативы',
      '/technologicalCard': 'Технологические карты',
      '/supplySources': 'Источники поставок',
      '/docs': 'Документация',
    };
    
    return titleMap[currentPath] || 'Главная';
  };

  // Если пользователь не авторизован и находится на защищенной странице
  if (!isAuth && currentPath !== '/login' && currentPath !== '/register') {
    return null; // Будет редирект в useEffect
  }

  // Если пользователь не авторизован, но на странице логина/регистрации
  if (!isAuth) {
    return <Outlet />;
  }

  return (
    <>
      <Layout style={{ minHeight: '100vh', margin: 0, padding: 0 }}>
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={(value) => setCollapsed(value)}
          style={{
            background: '#023f26ff',
            margin: 0,
            padding: 0,
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          {/* Заголовок приложения */}
          <div 
            style={{
              color: 'white',
              textAlign: 'center',
              padding: '16px 0',
              fontSize: collapsed ? '14px' : '18px',
              fontWeight: 'bold',
              borderBottom: '1px solid rgba(2, 3, 37, 0.16)',
              cursor: 'pointer',
            }}
            onClick={() => history.push('/')}
          >
            {collapsed ? 'УЦП' : 'Управление цепочками поставок'}
          </div>
          
          <Menu
            theme="dark"
            selectedKeys={[selectedKey]}
            mode="inline"
            items={items}
            onSelect={handleMenuSelect}
            style={{
              border: 'none',
              background: 'transparent',
              marginTop: '16px',
            }}
          />
        </Sider>
        
        <Layout style={{ 
          marginLeft: collapsed ? 80 : 200,
          transition: 'margin-left 0.2s',
          minHeight: '100vh'
        }}>
          <Header style={{ 
            padding: '0 16px', 
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            zIndex: 1,
          }}>
            <div></div>
            <Dropdown 
              menu={{ items: userMenuItems }} 
              trigger={['click']}
              placement="bottomRight"
            >
              <Button 
                type="text" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  height: '64px',
                  padding: '0 16px',
                }}
              >
                <Avatar 
                  icon={<UserOutlined />} 
                  style={{ 
                    backgroundColor: '#023f26ff',
                    marginRight: '8px'
                  }}
                />
                {!collapsed && (
                  <span style={{ marginLeft: 8 }}>
                    {userInfo?.login || 'Пользователь'}
                  </span>
                )}
              </Button>
            </Dropdown>
          </Header>
          <Content style={{ margin: '0 16px', padding: '16px 0' }}>
            <Breadcrumb style={{ margin: '16px 0' }} items={getBreadcrumbItems()} />
            <div
              style={{
                padding: 24,
                minHeight: 360,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
            >
              <h1 style={{ marginBottom: 24, color: '#023f26ff' }}>
                {getPageTitle()}
              </h1>
              <Outlet />
            </div>
          </Content>
          <Footer style={{ 
            textAlign: 'center', 
            padding: '16px 50px',
            background: '#fafafa',
            borderTop: '1px solid #f0f0f0'
          }}>
            Управление цепочками поставок © {new Date().getFullYear()}
          </Footer>
        </Layout>
      </Layout>

      {/* Модальное окно подтверждения выхода */}
      <Modal
        title="Подтверждение выхода"
        open={logoutModalVisible}
        onOk={confirmLogout}
        onCancel={cancelLogout}
        okText="Выйти"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <p>Вы уверены, что хотите выйти из системы?</p>
      </Modal>
    </>
  );
};

export default App;