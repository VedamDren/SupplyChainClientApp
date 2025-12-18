import { extend } from 'umi-request';
import { message } from 'antd';
import { getToken, logout } from '@/services/authService';

const request = extend({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
request.interceptors.request.use((url, options) => {
  const token = getToken();
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return {
    url,
    options,
  };
});

export default request;