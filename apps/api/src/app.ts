import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { setupSwagger } from './config/swagger';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';


const app = express();



// Security and Core Middlewares
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Global Rate Limiting
app.use(globalRateLimiter);

// Security: Enforce request body payload size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// API Documentation
setupSwagger(app);

// Routes
app.use('/api/v1/auth', authRoutes);

// Global Error Handler (Must be registered last)
app.use(errorHandler);

export default app;