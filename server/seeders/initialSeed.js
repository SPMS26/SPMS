const fs = require('fs');
const path = require('path');
const db = require('../config/database');
require('dotenv').config();

async function runSeed() {
  try {
    console.log('[Seed] Reading seed.sql file...');
    const seedSqlPath = path.join(__dirname, '../seed.sql');
    const sql = fs.readFileSync(seedSqlPath, 'utf8');

    console.log('[Seed] Executing seed.sql against PostgreSQL database...');
    await db.query(sql);

    console.log('===========================================================');
    console.log('✅ PostgreSQL Database Successfully Seeded from seed.sql!');
    console.log('-----------------------------------------------------------');
    console.log('Demo Credentials:');
    console.log(' 👑 Super Admin:        admin@spms.com     / admin123');
    console.log(' 🛡️ Security Operator:  operator@spms.com  / admin123');
    console.log(' 🚗 User (Mehanna):     mehanna@spms.com   / user123');
    console.log(' 🚗 User (Aditya):      aditya@spms.com    / user123');
    console.log(' 🚗 User (Priya):       priya@spms.com     / user123');
    console.log('===========================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to execute seed.sql:', err);
    process.exit(1);
  }
}

runSeed();
