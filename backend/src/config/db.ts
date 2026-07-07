import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error('Missing DATABASE_URL in environment variables.');
  process.exit(1);
}

// Locate ca.pem. We check backend/ca.pem first, which is '../../ca.pem' relative to this file's output directory (dist/config)
// Let's resolve the path robustly relative to __dirname and process.cwd()
const possiblePaths = [
  process.env.DB_CA_PATH,
  path.join(__dirname, '../../ca.pem'),
  path.join(__dirname, '../ca.pem'),
  path.join(process.cwd(), 'ca.pem'),
  path.join(process.cwd(), 'backend/ca.pem'),
].filter((p): p is string => !!p);

let caPath = '';
let caContent = '';

for (const p of possiblePaths) {
  try {
    const resolvedPath = path.resolve(p);
    if (fs.existsSync(resolvedPath)) {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      // Verify it's not just our placeholder file
      if (content && !content.includes('REPLACE THIS TEMPLATE WITH YOUR ACTUAL')) {
        caPath = resolvedPath;
        caContent = content;
        break;
      }
    }
  } catch (err) {
    // Ignore error and check next path
  }
}

let sslConfig: any = {
  rejectUnauthorized: false,
};

if (caContent && process.env.DB_STRICT_SSL === 'true') {
  sslConfig = {
    rejectUnauthorized: true,
    ca: caContent,
  };
  logger.info('DATABASE: Strict SSL certificate verification enabled with ca.pem.');
} else {
  sslConfig = {
    rejectUnauthorized: false,
  };
  logger.info('DATABASE: SSL connection encryption active (rejectUnauthorized: false).');
}



// Strip query parameters (like ?sslmode=require) to prevent pg parser from overriding our sslConfig object
const cleanConnectionString = connectionString.split('?')[0];

export const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: sslConfig,
});

logger.info('PostgreSQL Pool successfully initialized.');

export const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    logger.info('DATABASE: Starting auto-migration and schema initialization...');

    // 1. Resolve paths to migration and seed files
    const migrationPath = path.resolve(process.cwd(), '../supabase/migrations/20260704000000_init_schema.sql');
    const seedPath = path.resolve(process.cwd(), '../supabase/seed.sql');

    // 2. Run schema initialization DDL
    if (fs.existsSync(migrationPath)) {
      const schemaSql = fs.readFileSync(migrationPath, 'utf8');
      await client.query(schemaSql);
      logger.info('DATABASE: Schema DDL executed successfully (or tables checked and verified).');
    } else {
      logger.warn(`DATABASE: Migration file not found at ${migrationPath}`);
    }

    // 3. Check if seeding is required (e.g. check if profiles table has any user)
    const profileCheck = await client.query('SELECT COUNT(*) FROM profiles');
    const profileCount = parseInt(profileCheck.rows[0].count, 10);

    if (profileCount === 0) {
      logger.info('DATABASE: Profiles table is empty. Seeding initial admin and billing accounts...');
      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await client.query(seedSql);
        logger.info('DATABASE: Seed SQL data loaded successfully.');
      } else {
        logger.warn(`DATABASE: Seed file not found at ${seedPath}`);
      }
    } else {
      logger.info('DATABASE: Profiles already exist. Skipping seed data population.');
    }

    // 4. Query and log all public tables to verify they exist
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tableNames = tablesRes.rows.map((row: any) => row.table_name);
    logger.info(`DATABASE: Verified active tables: [ ${tableNames.join(', ')} ]`);

    // 5. Print table row counts and sample records
    logger.info('DATABASE: Fetching and printing all table values...');
    for (const tableName of tableNames) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
      const count = countRes.rows[0].count;
      const dataRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 5`);
      
      console.log(`\n[DATABASE TABLE: ${tableName} | Total Rows: ${count}]`);
      if (dataRes.rows.length > 0) {
        console.table(dataRes.rows);
      } else {
        console.log('(Table is empty)');
      }
    }
    console.log('\n');

  } catch (err: any) {
    logger.error(`DATABASE: Error initializing database schema: ${err.message}`);
  } finally {
    client.release();
  }
};

