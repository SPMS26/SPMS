import 'dotenv/config';
import { Pool } from 'pg';

// Hosted Postgres (Neon) gives a single connection string and requires SSL;
// local development keeps using the separate DB_* variables.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Neon suspends idle compute and drops its connections, so don't hold them long
      idleTimeoutMillis: 30000,
      max: 10
    })
  : new Pool({
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
