type Environment = 'dev' | 'homol' | 'prod';

interface EnvConfig {
  apiUrl: string;
  env: Environment;
}

function resolveEnv(): Environment {
  const env = import.meta.env.VITE_ENV as Environment | undefined;
  if (env === 'dev' || env === 'homol' || env === 'prod') return env;
  return import.meta.env.DEV ? 'dev' : 'prod';
}

function resolveApiUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  return url ? `${url}/api` : '/api';
}

export const env: EnvConfig = {
  env: resolveEnv(),
  apiUrl: resolveApiUrl(),
};
