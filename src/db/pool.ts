import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

let pool: Pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });
} else {
  pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'harsha',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'game_tracker'
  });
}

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle database client', err);
});

export default pool;
