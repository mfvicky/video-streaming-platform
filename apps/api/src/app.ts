import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { setupSwagger } from './config/swagger.js';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import videoRoutes from './routes/video.routes.js';
import adminRoutes from './routes/admin.routes.js';
import healthRoutes from './routes/health.routes.js';
import { protectCookieMutations } from './middlewares/csrf.middleware.js';

const app = express();

// Security and Core Middlewares
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Dedicated lightweight quota: public readiness checks must not starve normal API requests.
const healthRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: false,
  legacyHeaders: false,
});
app.use('/api/v1/health', healthRateLimiter, healthRoutes);

// Global Rate Limiting
app.use(globalRateLimiter);

// Security: Enforce request body payload size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(protectCookieMutations);

// API Documentation
setupSwagger(app);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/video', videoRoutes);
app.use('/api/v1/admin', adminRoutes);

// Global Error Handler (Must be registered last)
app.use(errorHandler);

export default app;
