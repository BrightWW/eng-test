import axios from 'axios';

// Use environment variable for API URL in production, fallback to proxy in development
const baseURL = process.env.REACT_APP_API_URL 
  ? `${process.env.REACT_APP_API_URL}/api` 
  : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('teacherToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('teacherToken');
      if (window.location.pathname.startsWith('/teacher')) {
        window.location.href = '/teacher/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
