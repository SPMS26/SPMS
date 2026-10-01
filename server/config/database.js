import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'spms'
});

pool.on('connect', () => {
  console.log('[Database] Connected to PostgreSQL database via native pg pool.');
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected PostgreSQL pool error:', err);
});

export default {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
