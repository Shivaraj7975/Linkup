const fs = require('fs');
const path = require('path');
const { Client, Pool } = require('pg');
require('dotenv').config();

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT, 10) || 5432;
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '6844';
const dbName = process.env.DB_NAME || 'meld_db';

/**
 * Connect to default 'postgres' database to verify or create the application database
 */
async function ensureDatabaseExists() {
  console.log(`🔍 Checking if PostgreSQL database "${dbName}" exists...`);
  
  const systemClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  });

  try {
    await systemClient.connect();
    const res = await systemClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    
    if (res.rowCount === 0) {
      console.log(`📦 Creating new database "${dbName}"...`);
      await systemClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`📦 Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error(`❌ System database connection failed:`, error.message);
    throw error;
  } finally {
    await systemClient.end();
  }
}

/**
 * Execute schema.sql and seed.sql on the target database
 */
async function initializeDatabase() {
  try {
    // 1. Ensure target database exists
    await ensureDatabaseExists();

    // 2. Connect pool to target database
    const appPool = new Pool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });

    console.log(`🔄 Starting schema initialization for database "${dbName}"...`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedPath = path.join(__dirname, 'seed.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('📜 Executing schema.sql DDL script...');
    await appPool.query(schemaSql);
    console.log('✅ Database schema, tables, indexes, and triggers created successfully.');

    console.log('🌱 Executing seed.sql DML script...');
    await appPool.query(seedSql);
    console.log('✅ Seed data for skills and interests inserted successfully.');

    // Count inserted records for verification
    const skillsRes = await appPool.query('SELECT COUNT(*) FROM skills');
    const interestsRes = await appPool.query('SELECT COUNT(*) FROM interests');
    
    console.log(`📊 Current Skills Count: ${skillsRes.rows[0].count}`);
    console.log(`📊 Current Interests Count: ${interestsRes.rows[0].count}`);
    console.log(`🎉 Database "${dbName}" initialization complete!`);

    await appPool.end();
  } catch (error) {
    console.error('❌ Error during database initialization:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = {
  initializeDatabase,
};
