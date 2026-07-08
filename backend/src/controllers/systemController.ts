import { Request, Response } from 'express';
import { pool } from '../config/db';
import { logger } from '../config/logger';

export const resetDatabase = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete table contents sequentially in reference-safe order
    await client.query('DELETE FROM transaction_services');
    await client.query('DELETE FROM transactions');
    await client.query('DELETE FROM expenses');
    await client.query('DELETE FROM customers');
    await client.query('DELETE FROM services');
    await client.query('DELETE FROM profiles WHERE role != $1', ['admin']);
    
    await client.query('COMMIT');
    
    logger.info('DATABASE RESET: All tables cleared. Kept only administrator profiles.');
    return res.json({
      status: 'success',
      message: 'Database tables reset successfully. Customers, services, sales, and expenses cleared. Only administrator login is kept.',
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error(`Error in resetDatabase: ${err.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to reset database tables.',
    });
  } finally {
    client.release();
  }
};
