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
 * Standard output structure for model responses
 */
export interface ModelOutput<T = any> {
  /** The main result from the model processing */
  result: T;
  /** Additional metadata about the processing */
  metadata?: {
    /** Processing time in milliseconds */
    processingTime?: number;
    /** Model version or identifier used */
    modelVersion?: string;
    /** Additional context or information */
    [key: string]: any;
  };
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
