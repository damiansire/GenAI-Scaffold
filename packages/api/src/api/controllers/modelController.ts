import { Request, Response, NextFunction } from 'express';
import { ModelFactory } from '../../models/factory.js';
import { ProcessContext, ModelMetadata } from '../../models/strategy.interface.js';
import { ApiError, ApiResponse } from '../../core/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Interface for model invocation request body
 */
interface ModelInvocationRequest {
  [key: string]: any;
}

/**
 * Create the model controller with ModelFactory dependency
 * @param modelFactory - Instance of ModelFactory
 * @returns Express controller function
 */
export function createModelController(modelFactory: ModelFactory) {
  /**
   * Controller for invoking AI models
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    try {
      // Extract modelId from request parameters
      const modelId = req.params.modelId;
      
      if (!modelId) {
        throw ApiError.badRequest('Model ID is required in request parameters');
      }

      // Check if model is registered
      if (!modelFactory.isRegistered(modelId)) {
        throw ApiError.notFound(`Model '${modelId}' is not available`);
      }

      // Create model strategy instance
      const strategy = modelFactory.create(modelId);

      // Prepare request data
      const requestData: ModelInvocationRequest = {
        ...req.body
      };

      // Add file information if uploaded
      if (req.file) {
        requestData.file = {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          encoding: req.file.encoding,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer,
          path: req.file.path
        };
      }

      // Add multiple files if uploaded
      if (req.files) {
        if (Array.isArray(req.files)) {
          requestData.files = req.files.map(file => ({
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
            path: file.path
          }));
        } else {
          // Handle multiple files with different field names
          requestData.files = Object.keys(req.files).reduce((acc, fieldname) => {
            const files = (req.files as any)[fieldname];
            acc[fieldname] = Array.isArray(files) ? files : [files];
            return acc;
          }, {} as any);
        }
      }

      // Prepare processing context
      const context: ProcessContext = {
        apiKey: req.user?.apiKeyId,
        userId: req.user?.apiKeyId // Using API key ID as user identifier
      };

      // Log model invocation
      console.log(`🚀 Invoking model '${modelId}'`, {
        hasFile: !!req.file,
        hasFiles: !!req.files,
        bodyKeys: Object.keys(req.body),
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Invoke the model strategy
      const result = await strategy.process(requestData, context);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Prepare response
      const response: ApiResponse<any, ModelMetadata> = {
        success: true,
        data: result,
        metadata: {
          modelId,
          processingTime,
          timestamp: new Date().toISOString()
        }
      };

      // Log successful invocation
      console.log(`✅ Model '${modelId}' completed successfully`, {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });

      res.status(200).json(response);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Log error
      console.error(`❌ Model '${req.params.modelId}' invocation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });

      // Re-throw the error to be handled by error middleware
      throw error;
    }
  });
}

/**
 * Controller for getting model information
 * @param modelFactory - Instance of ModelFactory
 * @returns Express controller function
 */
export function createModelInfoController(modelFactory: ModelFactory) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const modelId = req.params.modelId;
    
    if (!modelId) {
      throw ApiError.badRequest('Model ID is required in request parameters');
    }

    if (!modelFactory.isRegistered(modelId)) {
      throw ApiError.notFound(`Model '${modelId}' is not available`);
    }

    // Get model information (this would need to be extended based on your needs)
    const modelInfo = {
      modelId,
      available: true,
      registeredAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: modelInfo
    });
  });
}

/**
 * Controller for listing all available models
 * @param modelFactory - Instance of ModelFactory
 * @returns Express controller function
 */
export function createModelListController(modelFactory: ModelFactory) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const registeredModels = modelFactory.getRegisteredModels();
    
    const models = registeredModels.map(modelId => ({
      modelId,
      available: true,
      registeredAt: new Date().toISOString()
    }));

    res.json({
      success: true,
      data: {
        models,
        total: models.length
      }
    });
  });
}
