import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import db from '../config/database.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSeed() {
  try {
    let seedSqlPath = path.join(__dirname, '../config/seed.sql');
    if (!fs.existsSync(seedSqlPath)) {
      seedSqlPath = path.join(__dirname, '../../init_database.sql');
    }
    if (!fs.existsSync(seedSqlPath)) {
      seedSqlPath = path.join(__dirname, '../seed.sql');
    }
    console.log(`[Seed] Reading SQL from: ${seedSqlPath}`);
    const sql = fs.readFileSync(seedSqlPath, 'utf8');

    console.log('[Seed] Executing seed.sql against PostgreSQL database...');
    await db.query(sql);

    console.log('===========================================================');
    console.log('PostgreSQL Database Successfully Seeded from seed.sql!');
    console.log('-----------------------------------------------------------');
    console.log('Demo Credentials:');
    console.log(' Super Admin:        admin@spms.com     / admin123');
    console.log(' Security Operator:  operator@spms.com  / admin123');
    console.log(' User (Mehanna):     mehanna@spms.com   / user123');
    console.log(' User (Aditya):      aditya@spms.com    / user123');
    console.log(' User (Priya):       priya@spms.com     / user123');
    console.log('===========================================================');
    process.exit(0);
  } catch (err) {
    console.error('Failed to execute seed.sql:', err);
    process.exit(1);
  }
}

runSeed();
