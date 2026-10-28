const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
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

module.exports = initializeDatabase;

