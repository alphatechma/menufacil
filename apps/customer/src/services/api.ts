import axios from 'axios';
import Cookies from 'js-cookie';

function getTenantSlugFromUrl(): string {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  return pathParts[0] || '';
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const slug = getTenantSlugFromUrl();
  if (slug) {
    config.headers['X-Tenant-Slug'] = slug;
  }

  const token = Cookies.get('customer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('customer_token');
      // Force page reload to clear store or use a custom event to notify stores
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }
    return Promise.reject(error);
  },
);

export default api;
