import { DataSource } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv');
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '..', '..', '..', '.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'menufacil',
  password: process.env.DB_PASSWORD || 'menufacil123',
  database: process.env.DB_DATABASE || 'menufacil',
  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  synchronize: false,
});
