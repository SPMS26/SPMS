import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add JWT Auth token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spms_jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthorized / token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('spms_jwt_token');
      localStorage.removeItem('spms_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Identical GETs running at the same moment share one request
const inFlightGets = new Map();
const sendGet = api.get.bind(api);
api.get = (url, config) => {
  const key = `${url}|${JSON.stringify(config?.params ?? null)}`;
  if (!inFlightGets.has(key)) {
    inFlightGets.set(key, sendGet(url, config).finally(() => inFlightGets.delete(key)));
  }
  return inFlightGets.get(key);
};

export default api;
