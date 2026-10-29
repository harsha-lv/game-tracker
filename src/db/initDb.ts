import fs from 'fs';
import path from 'path';
import pool from './pool';

export async function initializeDatabase(): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    console.log('Connecting to PostgreSQL and running schema.sql...');
    await pool.query(schemaSql);
    console.log('✓ Database schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing database schema:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}
