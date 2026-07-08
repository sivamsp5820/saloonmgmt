import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './config/logger';
import { initializeDatabase } from './config/db';


// Route imports
import authRoutes from './routes/authRoutes';
import serviceRoutes from './routes/serviceRoutes';
import customerRoutes from './routes/customerRoutes';
import expenseRoutes from './routes/expenseRoutes';
import transactionRoutes from './routes/transactionRoutes';
import reportRoutes from './routes/reportRoutes';
import systemRoutes from './routes/systemRoutes';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Critical startup failure: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}


const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // Adjust to your frontend host domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { status: 'error', message: 'Too many requests from this IP, please try again later.' },
});
app.use(limiter);

// 3. Body Parsing Middleware
app.use(express.json());

// 4. Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// 5. REST Route Mappings
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/system', systemRoutes);

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 6. 404 Route Catch Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.url} not found.` });
});

// 7. Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled Server Error: ${err.message || err}`);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error. Please contact administrator.',
  });
});

// 8. Bind Server Port Listener
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    logger.info(`⚡ Saloon Management Express Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
});
