import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { modelFactory } from './models/factory.js';
import { schemaRegistry } from './models/registry.js';
import { loadPlugins } from './models/loader.js';
import { createModelRoutes } from './api/routes/modelRoutes.js';

// Load environment variables
dotenv.config();

/**
 * Main Express server configuration
 * Sets up middleware, loads plugins, and defines routes
 */
class Server {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env['PORT'] || '3000', 10);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:4200'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env['NODE_ENV'] || 'development',
        registeredModels: modelFactory.getRegisteredModels(),
        registeredSchemas: schemaRegistry.getRegisteredModels()
      });
    });

    // API info endpoint
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'AI Gateway API',
        version: '1.0.0',
        description: 'Multimodal AI Gateway with plugin architecture',
        availableModels: modelFactory.getRegisteredModels(),
        totalModels: modelFactory.getRegisteredModels().length
      });
    });

    // Model routes (authentication, validation, controllers)
    const modelRoutes = createModelRoutes(modelFactory, schemaRegistry);
    this.app.use('/api', modelRoutes);

    // 404 handler for undefined routes
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Initialize the server and load plugins
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing AI Gateway Server...');
      
      // Load all plugins
      console.log('📦 Loading plugins...');
      await loadPlugins(modelFactory, schemaRegistry);
      
      console.log('✅ Server initialization completed successfully');
    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      await this.initialize();
      
      this.app.listen(this.port, () => {
        console.log(`🌟 AI Gateway Server running on port ${this.port}`);
        console.log(`📊 Health check available at: http://localhost:${this.port}/health`);
        console.log(`📋 API info available at: http://localhost:${this.port}/api/info`);
        console.log(`🔌 Registered models: ${modelFactory.getRegisteredModels().join(', ') || 'None'}`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Get the Express application instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Create and start the server
const server = new Server();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('💥 Fatal error starting server:', error);
  process.exit(1);
});

export default server;
