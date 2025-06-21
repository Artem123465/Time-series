import axios from 'axios';
import Cookies from 'js-cookie';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true, // Включаем передачу cookies
});

// Добавляем интерцептор для включения CSRF-токена
apiClient.interceptors.request.use(
  (config) => {
    const csrfToken = Cookies.get('csrftoken');
    if (csrfToken && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;