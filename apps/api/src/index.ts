import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { setupSwagger } from './config/swagger';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Environment Variables Loaded:', process.env.PORT, process.env.CORS_ORIGIN);

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Setup Swagger UI
setupSwagger(app);

// Root endpoint
/**
 * @openapi
 * /:
 *   get:
 *     summary: root url test
 *     responses:
 *       200:
 *         description: Returns plain text confirmation that API is working or not
 */
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, root URL API is working....');
});

// API V1 endpoint
/**
 * @openapi
 * /api/v1:
 *   get:
 *     summary: API v1 test
 *     responses:
 *       200:
 *         description: Returns JSON object confirming API v1 operational status.
 */
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({ message: 'Hello v1! API is working smoothly.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});