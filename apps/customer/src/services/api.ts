import axios from 'axios';

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

  const token = localStorage.getItem('customer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('customer_token');
    }
    return Promise.reject(error);
  },
);

export default api;
