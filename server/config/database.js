import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'spms',
  // Reuse connections across quiet moments; the default of 10s reopens them after every pause
  idleTimeoutMillis: 60000
});

// Fires for every connection the pool opens, so only the first one is logged
pool.once('connect', () => {
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
