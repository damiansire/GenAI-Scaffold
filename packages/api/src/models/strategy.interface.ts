/**
 * Context information passed to model strategies during processing
 */
export interface ProcessContext {
  /** API key for authentication with external services */
  apiKey?: string;
  /** User identifier for tracking and authorization */
  userId?: string;
}

/**
 * Metadata about model processing
 */
export interface ModelMetadata {
  /** Processing time in milliseconds */
  processingTime?: number;
  /** Model version or identifier used */
  modelVersion?: string;
  /** Model identifier */
  modelId?: string;
  /** API provider name */
  apiProvider?: string;
  /** Timestamp of processing */
  timestamp?: string;
  /** Additional context or information */
  [key: string]: any;
}

/**
 * Standard output structure for model responses
 */
export interface ModelOutput<T = any> {
  /** The main result from the model processing */
  result: T;
  /** Additional metadata about the processing */
  metadata?: ModelMetadata;
}

/**
 * Generic interface for model strategies that process input and return output
 * @template TInput - Type of input data
 * @template TOutput - Type of output data
 */
export interface IModelStrategy<TInput, TOutput> {
  /**
   * Process input data using the model strategy
   * @param params - Input parameters for processing
   * @param context - Context information (API keys, user info, etc.)
   * @returns Promise resolving to the processed output
   */
  process(params: TInput, context: ProcessContext): Promise<TOutput>;
}
