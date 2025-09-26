import React, { useState } from 'react';
import {
  CaretRightOutlined,
  DesktopOutlined,
  ExpandOutlined,
  FileOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  PieChartOutlined,
  QuestionOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import Materials from '@/pages/Materials/';
import Subdivisions from '@/pages/Subdivision';
import Regulations from '@/pages/Regulations';
import SupplySources from '@/pages/SupplySources';
import TechnologicalCardsPage from '@/pages/TechnologicalCard';

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

const items: MenuItem[] = [
  getItem('Планы', 'sub1', <FolderOpenOutlined />, [
    getItem('План запасов', '1'),
    getItem('План перемещений', '2'),
    getItem('План продаж', '3'),
    getItem('План производства', '4'),
  ]),
  getItem('Закуп и списание сырья', '8', <SyncOutlined />),
  getItem('Справочники', 'sub2', <QuestionOutlined />, [
    getItem('Материалы', '9'),
    getItem('Подразделения', '10'),
    getItem('Нормативы', '6'),
    getItem('Технологические карты', '5'),
    getItem('Источники поставок', '7') // Уже есть в меню
  ]),
];

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('1');
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuSelect = ({ key }: { key: string }) => {
    setSelectedKey(key);
  };

  const getBreadcrumbItems = () => {
    switch (selectedKey) {
      case '9':
        return [
          { title: 'Справочники' },
          { title: 'Материалы' }
        ];
      case '10':
        return [
          { title: 'Справочники' },
          { title: 'Подразделения' }
        ];
      case '6':
        return [
          { title: 'Справочники' },
          { title: 'Нормативы' }
        ];
      case '7':
        return [
          { title: 'Справочники' },
          { title: 'Источники поставок' }
        ];
      case '5':
        return [
          { title: 'Справочники' },
          { title: 'Технологические карты' }
        ];
      default:
        return [{ title: 'Главная' }];
    }
  };

  const getPageTitle = () => {
    switch (selectedKey) {
      case '9':
        return 'Материалы';
      case '10':
        return 'Подразделения';
      case '6':
        return 'Нормативы';
      case '7':
        return 'Источники поставок';
      case '5':
        return 'Технологические карты';
      default:
        return 'Главная';
    }
  };

  const renderContent = () => {
    switch (selectedKey) {
      case '9':
        return <Materials />;
      case '10':
        return <Subdivisions />;
      case '6':
        return <Regulations />;
      case '7':
        return <SupplySources />;
      case '5':
        return <TechnologicalCardsPage />;
      default:
        return <div>Выберите пункт меню</div>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          defaultSelectedKeys={['1']}
          mode="inline"
          items={items}
          onSelect={handleMenuSelect}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb style={{ margin: '16px 0' }} items={getBreadcrumbItems()} />
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <h1 style={{ marginBottom: 24 }}>{getPageTitle()}</h1>
            {renderContent()}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Управление цепочками поставок {new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default App;