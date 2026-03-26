type Environment = 'dev' | 'homol' | 'prod';

interface EnvConfig {
  apiUrl: string;
  wsUrl: string;
  env: Environment;
}

const configs: Record<Environment, EnvConfig> = {
  dev: {
    apiUrl: 'https://menufacil-api.mp1rvc.easypanel.host/api',
    wsUrl: 'https://menufacil-api.mp1rvc.easypanel.host',
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
  const env = import.meta.env.VITE_ENV as Environment | undefined;
  if (env && configs[env]) return env;

  if (import.meta.env.DEV) return 'dev';
  return 'prod';
}

function resolveConfig(): EnvConfig {
  const env = resolveEnv();
  const base = configs[env];

  // Allow explicit overrides via env vars
  return {
    ...base,
    apiUrl: import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api`
      : base.apiUrl,
    wsUrl: import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || base.wsUrl,
  };
}

export const env = resolveConfig();
