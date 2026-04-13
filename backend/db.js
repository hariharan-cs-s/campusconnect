const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true // Keep true to allow schema.sql running if we need multiple statements
});

// Function to initialize database and tables
async function initializeDB() {
  try {
    // Create a temporary connection without database name to run schema.sql
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running schema setup...');
    await tempConnection.query(schemaSql);
    console.log('Schema initialized successfully.');
    
    await tempConnection.end();
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

module.exports = { pool, initializeDB };
