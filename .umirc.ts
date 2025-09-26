import { defineConfig } from "umi";

export default defineConfig({
  request: {},
  proxy: {
  '/api': {
    'target': 'http://127.0.0.1:5150/',
    'changeOrigin': true,
  }
},
  routes: [
    { path: "/", component: "index" },
    { path: "/docs", component: "docs" },
  ],
  npmClient: 'npm',
});
