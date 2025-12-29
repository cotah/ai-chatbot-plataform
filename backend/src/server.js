/**
 * Main Server Entry Point
 * Express server setup and route configuration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/index.js';
import logger from './utils/logger.js';
import { sessionMiddleware } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initRedis } from './services/redis.service.js';
import { initSupabase } from './services/supabase.service.js';

// Routes
import chatRoutes from './routes/chat.routes.js';
import audioRoutes from './routes/audio.routes.js';
import reservationsRoutes from './routes/reservations.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import videoRoutes from './routes/video.routes.js';
import healthRoutes from './routes/health.routes.js';

const app = express();
app.set("trust proxy", 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Adjust based on frontend requirements
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigin === '*' ? true : config.server.corsOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-API-Key', 'X-Client-Key'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware (must be before routes)
app.use(sessionMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    sessionId: req.sessionId,
  });
  next();
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/chat/audio', audioRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/health', healthRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Initialize Redis
    if (config.redis.url) {
      await initRedis();
      logger.info('Redis initialized');
    } else {
      logger.warn('Redis URL not configured, using fallback storage');
    }

    // Initialize Supabase
    if (config.supabase.url && config.supabase.serviceRoleKey) {
      initSupabase();
      logger.info('Supabase initialized');
    } else {
      logger.warn('Supabase credentials not configured');
    }
  } catch (error) {
    logger.error('Failed to initialize services', { error: error.message });
    // Continue anyway - services will use fallbacks
  }
}

// Start server
const PORT = config.server.port;

initializeServices().then(() => {
  app.listen(PORT, () => {
    logger.info('Server started', {
      port: PORT,
      environment: config.server.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;

