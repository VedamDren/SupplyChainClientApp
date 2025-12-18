import request from '@/utils/request';

export interface LoginParams {
  login: string;
  password: string;
}

export interface RegisterParams {
  login: string;
  password: string;
  name?: string;
}

export interface LoginResponse {
  status: number;
  message: string;
  token?: string;
  login?: string;
  userId?: number;
}

export interface RegisterResponse {
  status: number;
  message: string;
  login?: string;
}

export async function login(params: LoginParams): Promise<LoginResponse> {
  return request('/api/Auth/Login', {
    method: 'POST',
    data: params,
  });
}

export async function register(params: RegisterParams): Promise<RegisterResponse> {
  return request('/api/Auth/Register', {
    method: 'POST',
    data: params,
  });
}

// Проверка авторизации
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}

// Получение токена
export function getToken(): string | null {
  return localStorage.getItem('token');
}

// Получение информации о пользователе
export function getUserInfo(): any {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Выход
export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Перенаправляем на страницу входа
  window.location.href = '/login';
}