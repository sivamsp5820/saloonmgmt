import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is missing in environment.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString.split('?')[0],
  ssl: { rejectUnauthorized: false }
});

const dropTables = async () => {
  const client = await pool.connect();
  try {
    console.log('Dropping all existing database tables...');
    await client.query('DROP TABLE IF EXISTS transaction_services CASCADE;');
    await client.query('DROP TABLE IF EXISTS transactions CASCADE;');
    await client.query('DROP TABLE IF EXISTS services CASCADE;');
    await client.query('DROP TABLE IF EXISTS service_categories CASCADE;');
    await client.query('DROP TABLE IF EXISTS expenses CASCADE;');
    await client.query('DROP TABLE IF EXISTS customers CASCADE;');
    await client.query('DROP TABLE IF EXISTS profiles CASCADE;');
    console.log('All tables dropped successfully.');
  } catch (err: any) {
    console.error('Error dropping tables:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

dropTables();
