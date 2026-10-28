const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });
} else {
  pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT, 10) || 5432,
    user: process.env.PGUSER || 'harsha',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'game_tracker'
  });
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

module.exports = pool;

