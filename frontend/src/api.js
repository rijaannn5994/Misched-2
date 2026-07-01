import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Add auth header from sessionStorage on initial load
const token = sessionStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

api.interceptors.request.use((config) => {
  const t = sessionStorage.getItem('token');
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// Handle 401 responses - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;