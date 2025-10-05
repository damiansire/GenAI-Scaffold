import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../core/ApiError';

/**
 * Global error handler middleware for Express
 * Handles both ApiError instances and generic errors
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });

  // Handle ApiError instances
  if (err instanceof ApiError) {
    const errorResponse = {
      error: {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode,
        timestamp: err.timestamp,
        path: req.path,
        method: req.method
      }
    };

    // Add stack trace in development mode
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.stack = err.stack;
    }

    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle validation errors from express-validator or similar libraries
  if (err.name === 'ValidationError') {
    const errorResponse = {
      error: {
        name: 'ValidationError',
        message: err.message,
        statusCode: 422,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    };

    res.status(422).json(errorResponse);
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    const errorResponse = {
      error: {
        name: 'SyntaxError',
        message: 'Invalid JSON in request body',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle multer errors (file upload errors)
  if (err.name === 'MulterError') {
    const errorResponse = {
      error: {
        name: 'MulterError',
        message: err.message,
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle generic errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse = {
    error: {
      name: 'InternalServerError',
      message: isDevelopment ? err.message : 'Internal Server Error',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add stack trace in development mode
  if (isDevelopment) {
    errorResponse.error.stack = err.stack;
  }

  res.status(500).json(errorResponse);
}

/**
 * Async error wrapper utility
 * Wraps async route handlers to catch and forward errors to the error handler
 * @param fn - Async function to wrap
 * @returns Wrapped function that catches errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler middleware
 * Handles requests to non-existent routes
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
}
