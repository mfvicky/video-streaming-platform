import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const PORT = env.PORT;

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Video Processing API',
      version: '1.0.0',
      description: 'REST API documentation for video streaming platform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local Server',
      },
    ],
  },
  apis: ['./src/index.ts', './src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export function setupSwagger(app: Express): void {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}