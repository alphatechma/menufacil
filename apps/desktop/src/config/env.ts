type Environment = 'dev' | 'homol' | 'prod';

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
  homol: {
    apiUrl: 'https://menufacil-api-homol.mp1rvc.easypanel.host/api',
    wsUrl: 'https://menufacil-api-homol.mp1rvc.easypanel.host',
    env: 'homol',
  },
  prod: {
    apiUrl: 'https://menufacil-api.mp1rvc.easypanel.host/api',
    wsUrl: 'https://menufacil-api.mp1rvc.easypanel.host',
    env: 'prod',
  },
};

function resolveEnv(): Environment {
  const envVar = import.meta.env.VITE_ENV as Environment | undefined;
  if (envVar && configs[envVar]) return envVar;
  if (import.meta.env.DEV) return 'dev';
  return 'prod';
}

export const env: EnvConfig = configs[resolveEnv()];
