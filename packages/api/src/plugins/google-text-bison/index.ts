import { IModelStrategy, ProcessContext, ModelOutput } from '../../models/strategy.interface.js';

/**
 * Model ID for Google Text Bison
 */
export const modelId = 'google-text-bison';

/**
 * JSON Schema for Google Text Bison configuration
 * Defines the required input structure for the model
 */
export const configSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'The text prompt to send to the model',
      minLength: 1,
      maxLength: 8192
    },
    maxTokens: {
      type: 'number',
      description: 'Maximum number of tokens to generate',
      minimum: 1,
      maximum: 1024,
      default: 256
    },
    temperature: {
      type: 'number',
      description: 'Controls randomness in the output',
      minimum: 0.0,
      maximum: 1.0,
      default: 0.7
    },
    topP: {
      type: 'number',
      description: 'Controls diversity of the output',
      minimum: 0.0,
      maximum: 1.0,
      default: 0.9
    },
    topK: {
      type: 'number',
      description: 'Controls the number of top tokens to consider',
      minimum: 1,
      maximum: 100,
      default: 40
    },
    stopSequences: {
      type: 'array',
      description: 'Sequences where the model should stop generating',
      items: {
        type: 'string'
      },
      maxItems: 5
    }
  },
  required: ['prompt'],
  additionalProperties: true
};

/**
 * Input interface for Google Text Bison
 */
interface GoogleTextBisonInput {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

/**
 * Output interface for Google Text Bison
 */
interface GoogleTextBisonOutput {
  text: string;
  finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Google Text Bison Model Strategy Implementation
 * Simulates calls to Google's Text Bison API
 */
export class ModelStrategy implements IModelStrategy<GoogleTextBisonInput, ModelOutput<GoogleTextBisonOutput>> {
  private readonly modelName = 'text-bison-001';
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  /**
   * Process a text generation request
   * @param params - Input parameters for text generation
   * @param context - Processing context with API key and user info
   * @returns Promise resolving to the generated text response
   */
  async process(
    params: GoogleTextBisonInput, 
    context: ProcessContext
  ): Promise<ModelOutput<GoogleTextBisonOutput>> {
    const startTime = Date.now();

    try {
      // Validate required parameters
      if (!params.prompt || typeof params.prompt !== 'string') {
        throw new Error('Prompt is required and must be a string');
      }

      // Validate API key
      if (!context.apiKey) {
        throw new Error('API key is required for Google Text Bison');
      }

      // Prepare request parameters with defaults
      const requestParams = {
        prompt: params.prompt,
        maxTokens: params.maxTokens || 256,
        temperature: params.temperature || 0.7,
        topP: params.topP || 0.9,
        topK: params.topK || 40,
        stopSequences: params.stopSequences || []
      };

      // Log the request
      console.log(`🤖 Processing Google Text Bison request`, {
        promptLength: params.prompt.length,
        maxTokens: requestParams.maxTokens,
        temperature: requestParams.temperature,
        userId: context.userId,
        timestamp: new Date().toISOString()
      });

      // Simulate API call to Google Text Bison
      const response = await this.simulateGoogleTextBisonCall(requestParams, context.apiKey);

      const processingTime = Date.now() - startTime;

      // Log successful response
      console.log(`✅ Google Text Bison request completed`, {
        responseLength: response.text.length,
        processingTime: `${processingTime}ms`,
        finishReason: response.finishReason,
        totalTokens: response.usage.totalTokens
      });

      return {
        result: response,
        metadata: {
          processingTime,
          modelVersion: this.modelName,
          apiProvider: 'Google',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`❌ Google Text Bison request failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Simulate a call to Google Text Bison API
   * In a real implementation, this would make an actual HTTP request
   * @param params - Request parameters
   * @param apiKey - Google API key
   * @returns Simulated response
   */
  private async simulateGoogleTextBisonCall(
    params: GoogleTextBisonInput, 
    apiKey: string
  ): Promise<GoogleTextBisonOutput> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate different response scenarios
    const scenarios = [
      {
        text: `Based on your prompt: "${params.prompt}", here's a comprehensive response that demonstrates the capabilities of Google Text Bison. This model can generate creative, informative, and contextually appropriate text based on the input provided.`,
        finishReason: 'STOP' as const,
        usage: {
          promptTokens: Math.ceil(params.prompt.length / 4),
          completionTokens: Math.ceil(params.prompt.length / 3),
          totalTokens: Math.ceil(params.prompt.length / 2)
        }
      },
      {
        text: `This is a simulated response from Google Text Bison. The model has processed your request: "${params.prompt}" and generated this response. In a real implementation, this would be the actual output from Google's API.`,
        finishReason: 'STOP' as const,
        usage: {
          promptTokens: Math.ceil(params.prompt.length / 4),
          completionTokens: Math.ceil(params.prompt.length / 3),
          totalTokens: Math.ceil(params.prompt.length / 2)
        }
      },
      {
        text: `Here's what Google Text Bison would respond to: "${params.prompt}". This is a placeholder response that simulates the API behavior. The actual implementation would make HTTP requests to Google's Generative AI API.`,
        finishReason: 'MAX_TOKENS' as const,
        usage: {
          promptTokens: Math.ceil(params.prompt.length / 4),
          completionTokens: Math.ceil(params.prompt.length / 3),
          totalTokens: Math.ceil(params.prompt.length / 2)
        }
      }
    ];

    // Randomly select a scenario
    const selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    // Simulate occasional errors
    if (Math.random() < 0.05) { // 5% error rate
      throw new Error('Simulated API error: Rate limit exceeded');
    }

    return selectedScenario;
  }

  /**
   * Get model information
   * @returns Model metadata
   */
  getModelInfo() {
    return {
      modelId,
      modelName: this.modelName,
      provider: 'Google',
      type: 'text-generation',
      capabilities: ['text-generation', 'completion', 'conversation'],
      maxTokens: 1024,
      supportsStreaming: false
    };
  }
}