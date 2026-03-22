type Environment = 'dev' | 'prod';

interface EnvConfig {
  apiUrl: string;
  wsUrl: string;
  env: Environment;
}

const configs: Record<Environment, EnvConfig> = {
  dev: {
    apiUrl: '/api',
    wsUrl: 'http://localhost:3000',
    env: 'dev',
  },
  prod: {
    apiUrl: localStorage.getItem('desktop_api_url') || 'https://menufacil-api.mp1rvc.easypanel.host/api',
    wsUrl: localStorage.getItem('desktop_api_url')?.replace('/api', '') || 'https://menufacil-api.mp1rvc.easypanel.host',
    env: 'prod',
  },
};

export const env: EnvConfig = import.meta.env.DEV ? configs.dev : configs.prod;
