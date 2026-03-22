type Environment = 'dev' | 'homol' | 'prod';

interface EnvConfig {
  apiUrl: string;
  env: Environment;
}

const configs: Record<Environment, EnvConfig> = {
  dev: {
    apiUrl: 'http://localhost:3000/api',
    env: 'dev',
  },
  homol: {
    apiUrl: 'https://menufacil-api-homol.mp1rvc.easypanel.host/api',
    env: 'homol',
  },
  prod: {
    apiUrl: 'https://menufacil-api.mp1rvc.easypanel.host/api',
    env: 'prod',
  },
};

function resolveEnv(): Environment {
  const env = import.meta.env.VITE_ENV as Environment | undefined;
  if (env && configs[env]) return env;

  if (import.meta.env.DEV) return 'dev';
  return 'prod';
}

function resolveConfig(): EnvConfig {
  const env = resolveEnv();
  const base = configs[env];

  return {
    ...base,
    apiUrl: import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api`
      : base.apiUrl,
  };
}

export const env = resolveConfig();
