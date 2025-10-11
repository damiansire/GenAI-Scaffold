import { IModelStrategy, ProcessContext, ModelOutput } from '../../models/strategy.interface.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Input parameters for Gemini Image Generation
 */
export interface GeminiImageGenInput {
  prompt: string;
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  responseModalities?: ('Image' | 'Text')[];
  inputImages?: Array<{
    data: string; // base64
    mimeType: string;
  }>;
}

/**
 * Output from Gemini Image Generation
 */
export interface GeminiImageGenOutput {
  images: Array<{
    data: string; // base64
    mimeType: string;
  }>;
  text?: string;
}

/**
 * Model ID for registration
 */
export const modelId = 'gemini-image-gen';

/**
 * JSON Schema for input validation
 */
export const configSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'Descriptive text prompt for image generation or editing',
      minLength: 1,
      maxLength: 8192
    },
    aspectRatio: {
      type: 'string',
      description: 'Aspect ratio for generated image',
      enum: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
      default: '1:1'
    },
    responseModalities: {
      type: 'array',
      description: 'Output modalities (Image, Text, or both)',
      items: {
        type: 'string',
        enum: ['Image', 'Text']
      },
      default: ['Image', 'Text']
    },
    inputImages: {
      type: 'array',
      description: 'Optional input images for editing or composition',
      items: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Base64 encoded image data' },
          mimeType: { type: 'string', description: 'Image MIME type' }
        },
        required: ['data', 'mimeType']
      }
    }
  },
  required: ['prompt']
};

/**
 * Gemini 2.5 Flash Image Generation Strategy (Nano Banana)
 * Supports text-to-image and image editing capabilities
 */
export class ModelStrategy implements IModelStrategy<GeminiImageGenInput, ModelOutput<GeminiImageGenOutput>> {
  readonly modelName = 'gemini-2.5-flash-image';
  readonly description = 'Gemini 2.5 Flash Image Generation - Text-to-Image, Image Editing, Style Transfer';
  
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'];
    
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found in environment variables. Image generation will fail.');
      console.warn('Please set GEMINI_API_KEY in your .env file');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
  }

  /**
   * Process image generation request
   */
  async process(
    params: GeminiImageGenInput,
    context: ProcessContext
  ): Promise<ModelOutput<GeminiImageGenOutput>> {
    const startTime = Date.now();

    try {
      console.log(`🎨 Processing Gemini Image Generation request`);
      console.log(`📝 Prompt: ${params.prompt.substring(0, 100)}...`);
      console.log(`📐 Aspect Ratio: ${params.aspectRatio || '1:1'}`);
      console.log(`🖼️ Input Images: ${params.inputImages?.length || 0}`);

      // Check for API key
      if (!process.env['GEMINI_API_KEY']) {
        throw new Error('GEMINI_API_KEY is not configured. Please set it in your .env file.');
      }

      // Build the content parts for the request
      const contents = this.buildContentParts(params);

      // Configure the request
      const config: any = {
        imageConfig: {
          aspectRatio: params.aspectRatio || '1:1'
        }
      };

      if (params.responseModalities && params.responseModalities.length > 0) {
        config.responseModalities = params.responseModalities;
      }

      // Get the model
      const model = this.genAI.getGenerativeModel({ 
        model: this.modelName 
      });

      // Generate content
      console.log('🚀 Calling Gemini API...');
      const result = await model.generateContent({
        contents,
        generationConfig: config
      });

      const response = result.response;
      const processingTime = Date.now() - startTime;

      console.log(`✅ Gemini API responded in ${processingTime}ms`);

      // Extract images and text from response
      const output = this.extractOutputFromResponse(response);

      console.log(`📊 Generated ${output.images.length} image(s)`);
      if (output.text) {
        console.log(`📝 Text: ${output.text.substring(0, 100)}...`);
      }

      return {
        result: output,
        metadata: {
          processingTime,
          modelVersion: this.modelName,
          apiProvider: 'Google Gemini',
          aspectRatio: params.aspectRatio || '1:1',
          hasInputImages: (params.inputImages?.length || 0) > 0,
          mode: params.inputImages?.length ? 'image-editing' : 'text-to-image',
          imagesGenerated: output.images.length
        }
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Gemini Image Generation error:', error);

      if (error instanceof Error) {
        throw new Error(`Gemini Image Generation failed: ${error.message}`);
      }
      
      throw new Error('Gemini Image Generation failed: Unknown error');
    }
  }

  /**
   * Build content parts for Gemini API request
   */
  private buildContentParts(params: GeminiImageGenInput): any {
    const parts: any[] = [];

    // Add input images first if provided (for editing mode)
    if (params.inputImages && params.inputImages.length > 0) {
      for (const image of params.inputImages) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data
          }
        });
      }
    }

    // Add text prompt
    parts.push({
      text: params.prompt
    });

    return parts;
  }

  /**
   * Extract images and text from Gemini response
   */
  private extractOutputFromResponse(response: any): GeminiImageGenOutput {
    const output: GeminiImageGenOutput = {
      images: [],
      text: undefined
    };

    // Process all candidates (usually just one)
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // Extract text
          if (part.text) {
            if (!output.text) {
              output.text = part.text;
            } else {
              output.text += '\n' + part.text;
            }
          }
          
          // Extract images
          if (part.inlineData) {
            output.images.push({
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png'
            });
          }
        }
      }
    }

    return output;
  }

  /**
   * Get image resolution from aspect ratio
   */
  private getResolutionFromAspectRatio(aspectRatio: string): { width: number; height: number } {
    const resolutions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 },
      '2:3': { width: 832, height: 1248 },
      '3:2': { width: 1248, height: 832 },
      '3:4': { width: 864, height: 1184 },
      '4:3': { width: 1184, height: 864 },
      '4:5': { width: 896, height: 1152 },
      '5:4': { width: 1152, height: 896 },
      '9:16': { width: 768, height: 1344 },
      '16:9': { width: 1344, height: 768 },
      '21:9': { width: 1536, height: 672 }
    };

    return resolutions[aspectRatio] || resolutions['1:1'];
  }
}
