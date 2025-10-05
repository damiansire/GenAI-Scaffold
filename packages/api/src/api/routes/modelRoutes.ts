import { Router } from 'express';
import multer from 'multer';
import { ModelFactory } from '../../models/factory';
import { SchemaRegistry } from '../../models/registry';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { createDynamicValidationMiddleware } from '../middleware/dynamicValidation';
import { 
  createModelController, 
  createModelInfoController, 
  createModelListController 
} from '../controllers/modelController';

/**
 * Create model routes with dependencies
 * @param modelFactory - Instance of ModelFactory
 * @param schemaRegistry - Instance of SchemaRegistry
 * @returns Express router
 */
export function createModelRoutes(modelFactory: ModelFactory, schemaRegistry: SchemaRegistry): Router {
  const router = Router();

  // Create middleware instances
  const dynamicValidation = createDynamicValidationMiddleware(schemaRegistry);
  
  // Create controller instances
  const modelController = createModelController(modelFactory);
  const modelInfoController = createModelInfoController(modelFactory);
  const modelListController = createModelListController(modelFactory);

  /**
   * Create dynamic multer middleware based on schema requirements
   * @param modelId - Model identifier
   * @returns Multer middleware or null
   */
  function createDynamicMulterMiddleware(modelId: string) {
    try {
      // Check if the model schema requires file upload
      const schema = schemaRegistry.getSchema(modelId);
      
      // Check if schema has file-related properties
      const hasFileRequirements = checkSchemaForFileRequirements(schema);
      
      if (!hasFileRequirements) {
        // No file requirements, return a pass-through middleware
        return (req: any, res: any, next: any) => next();
      }

      // Configure multer for file uploads
      const storage = multer.memoryStorage();
      
      const upload = multer({
        storage,
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
          files: 5 // Maximum 5 files
        },
        fileFilter: (req, file, cb) => {
          // Basic file type validation
          const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'application/pdf',
            'application/json'
          ];

          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`));
          }
        }
      });

      return upload.any(); // Accept any number of files with any field name
    } catch (error) {
      // If schema not found, assume no file requirements
      return (req: any, res: any, next: any) => next();
    }
  }

  /**
   * Check if schema requires file uploads
   * @param schema - JSON Schema
   * @returns True if file upload is required
   */
  function checkSchemaForFileRequirements(schema: any): boolean {
    if (!schema || typeof schema !== 'object') {
      return false;
    }

    // Check for file-related properties in schema
    const fileKeywords = ['file', 'files', 'upload', 'image', 'document'];
    
    function checkObject(obj: any): boolean {
      if (typeof obj !== 'object' || obj === null) {
        return false;
      }

      // Check properties
      if (obj.properties) {
        for (const key of Object.keys(obj.properties)) {
          if (fileKeywords.some(keyword => key.toLowerCase().includes(keyword))) {
            return true;
          }
          if (checkObject(obj.properties[key])) {
            return true;
          }
        }
      }

      // Check required fields
      if (obj.required && Array.isArray(obj.required)) {
        for (const field of obj.required) {
          if (fileKeywords.some(keyword => field.toLowerCase().includes(keyword))) {
            return true;
          }
        }
      }

      // Check items for arrays
      if (obj.items && checkObject(obj.items)) {
        return true;
      }

      // Check anyOf, oneOf, allOf
      const checkArray = (arr: any[]) => arr.some(item => checkObject(item));
      
      if (obj.anyOf && checkArray(obj.anyOf)) return true;
      if (obj.oneOf && checkArray(obj.oneOf)) return true;
      if (obj.allOf && checkArray(obj.allOf)) return true;

      return false;
    }

    return checkObject(schema);
  }

  // Routes

  /**
   * GET /models - List all available models
   */
  router.get('/models', 
    apiKeyAuth,
    modelListController
  );

  /**
   * GET /models/:modelId - Get information about a specific model
   */
  router.get('/models/:modelId', 
    apiKeyAuth,
    modelInfoController
  );

  /**
   * POST /models/:modelId/invoke - Invoke a specific model
   * Applies authentication, dynamic validation, and file upload middleware
   */
  router.post('/models/:modelId/invoke', 
    apiKeyAuth,
    (req, res, next) => {
      // Apply dynamic multer middleware based on model requirements
      const multerMiddleware = createDynamicMulterMiddleware(req.params.modelId);
      multerMiddleware(req, res, next);
    },
    dynamicValidation,
    modelController
  );

  return router;
}

/**
 * Create a default model routes instance
 * This should be called after the factory and registry are initialized
 */
export function createDefaultModelRoutes(): Router {
  // This will be set up when the server initializes
  throw new Error('createDefaultModelRoutes() should be called after ModelFactory and SchemaRegistry are initialized');
}
