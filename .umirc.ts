import { defineConfig } from "umi";

export default defineConfig({
  request: {},
  proxy: {
    '/api': {
      'target': 'http://127.0.0.1:5150/',
      'changeOrigin': true,
      // Убрали pathRewrite, чтобы /api оставался в пути
    }
  },
  routes: [
    // Публичные маршруты (не требуют авторизации)
    { path: '/login', component: '@/pages/Login/index' },
    { path: '/register', component: '@/pages/Register/index' },
    
    // Защищенные маршруты (требуют авторизации)
    { path: '/', component: '@/pages/index' },
    { path: '/materials', component: '@/pages/Materials/index' },
    { path: '/salesPlan', component: '@/pages/SalesPlan/index' },
    { path: '/subdivision', component: '@/pages/Subdivision/index' },
    { path: '/regulations', component: '@/pages/Regulations/index' },
    { path: '/technologicalCard', component: '@/pages/TechnologicalCard/index' },
    { path: '/supplySources', component: '@/pages/SupplySources/index' },
    { path: '/inventoryPlan', component: '@/pages/InventoryPlan/index' },
    { path: '/transferPlan', component: '@/pages/TransferPlan/index' },
  ],
  npmClient: 'npm',
});