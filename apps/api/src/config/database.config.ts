import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'menufacil'),
  password: configService.get('DB_PASSWORD', 'menufacil123'),
  database: configService.get('DB_DATABASE', 'menufacil'),
  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  synchronize: false, // Always false — use migrations
  migrationsRun: false, // Rodar migrations manualmente via CLI
  logging: configService.get('NODE_ENV') === 'development',
  extra: {
    options: '-c timezone=America/Sao_Paulo',
    max: 20, // max connections
    min: 5, // min connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});
