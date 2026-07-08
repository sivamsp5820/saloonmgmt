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

// Zod schema for profile creation
export const createProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(4, 'Password must be at least 4 characters'),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['admin', 'billing']),
  }),
});

// Zod schema for profile updates
export const updateProfileSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid profile ID format'),
  }),
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    password: z.string().min(4, 'Password must be at least 4 characters').optional(),
    name: z.string().min(1, 'Name is required').optional(),
    role: z.enum(['admin', 'billing']).optional(),
  }),
});

export const getProfiles = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, username, name, role, created_at FROM profiles ORDER BY role ASC, name ASC'
    );
    return res.json({ status: 'success', data: result.rows });
  } catch (err: any) {
    logger.error(`Error in getProfiles: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve profiles.' });
  }
};

export const createProfile = async (req: Request, res: Response) => {
  const { username, password, name, role } = req.body;
  try {
    const checkRes = await pool.query('SELECT id FROM profiles WHERE username = $1 LIMIT 1', [username]);
    if ((checkRes.rowCount || 0) > 0) {
      return res.status(400).json({ status: 'error', message: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO profiles (username, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role, created_at',
      [username, passwordHash, name, role]
    );

    logger.info(`Profile created: ${name} (${role}) by admin ${req.user?.username}`);
    return res.json({ status: 'success', data: result.rows[0] });
  } catch (err: any) {
    logger.error(`Error in createProfile: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to create profile.' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, password, name, role } = req.body;
  try {
    if (username) {
      const checkRes = await pool.query('SELECT id FROM profiles WHERE username = $1 AND id != $2 LIMIT 1', [username, id]);
      if ((checkRes.rowCount || 0) > 0) {
        return res.status(400).json({ status: 'error', message: 'Username is already taken.' });
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (username) {
      updates.push(`username = $${idx++}`);
      values.push(username);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updates.push(`password_hash = $${idx++}`);
      values.push(passwordHash);
    }
    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (role) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields provided for update.' });
    }

    values.push(id);
    const query = `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, name, role, created_at`;
    
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Profile not found.' });
    }

    logger.info(`Profile updated: ${result.rows[0].name} (${id})`);
    return res.json({ status: 'success', data: result.rows[0] });
  } catch (err: any) {
    logger.error(`Error in updateProfile: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to update profile.' });
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (req.user?.id === id) {
      return res.status(400).json({ status: 'error', message: 'You cannot delete your own admin account.' });
    }

    const result = await pool.query('DELETE FROM profiles WHERE id = $1 RETURNING id, name', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Profile not found.' });
    }

    logger.info(`Profile deleted: ${result.rows[0].name} (${id})`);
    return res.json({ status: 'success', message: 'Staff profile deleted successfully.' });
  } catch (err: any) {
    logger.error(`Error in deleteProfile: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to delete profile.' });
  }
};
