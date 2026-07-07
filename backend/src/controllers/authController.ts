import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/db';
import { logger } from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_change_me_in_production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// Zod schema for login validation
export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    // 1. Query user profile from database
    const result = await pool.query('SELECT * FROM profiles WHERE username = $1 LIMIT 1', [username]);
    const profile = result.rows[0];

    if (!profile) {
      logger.warn(`Failed login attempt for username: ${username}`);
      return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
    }

    // 2. Verify password with bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, profile.password_hash);
    if (!isPasswordValid) {
      logger.warn(`Failed login attempt for username: ${username}`);
      return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
    }

    // 3. Generate JWT token
    const tokenPayload = {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      role: profile.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRATION as any });

    logger.info(`User authenticated: ${profile.name} (${profile.role})`);

    return res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          role: profile.role,
        },
      },
    });
  } catch (err: any) {
    logger.error(`Error in login controller: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Internal server login error.' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Not authenticated.' });
  }

  return res.json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
};
