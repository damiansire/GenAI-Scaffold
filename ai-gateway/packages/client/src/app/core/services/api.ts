import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Interface for API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  metadata?: {
    modelId: string;
    processingTime: number;
    timestamp: string;
  };
  error?: string;
}

/**
 * Interface for model invocation request
 */
export interface ModelInvocationRequest {
  [key: string]: any;
}

/**
 * Interface for model invocation response
 */
export interface ModelInvocationResponse {
  success: boolean;
  data?: any;
  metadata?: {
    modelId: string;
    processingTime: number;
    timestamp: string;
  };
  error?: string;
}

/**
 * Interface for available models
 */
export interface AvailableModel {
  modelId: string;
  available: boolean;
  registeredAt: string;
}

/**
 * Interface for models list response
 */
export interface ModelsListResponse {
  success: boolean;
  data: {
    models: AvailableModel[];
    total: number;
  };
}

/**
 * Centralized API service for communicating with the AI Gateway backend
 * Provides methods for model invocation and API management
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api';
  private readonly apiKey = environment.apiKey || '';

  /**
   * Invoke a specific AI model with the given payload
   * @param modelId - The ID of the model to invoke
   * @param payload - The data to send to the model
   * @returns Observable with the model response
   */
  invokeModel(modelId: string, payload: ModelInvocationRequest): Observable<ModelInvocationResponse> {
    const url = `${this.baseUrl}/models/${modelId}/invoke`;
    const headers = this.createHeaders();

    console.log(`🚀 Invoking model '${modelId}'`, {
      url,
      payload: this.sanitizePayload(payload),
      timestamp: new Date().toISOString()
    });

    return this.http.post<ModelInvocationResponse>(url, payload, { headers })
      .pipe(
        map(response => {
          console.log(`✅ Model '${modelId}' invocation successful`, {
            success: response.success,
            processingTime: response.metadata?.processingTime,
            timestamp: new Date().toISOString()
          });
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get list of all available models
   * @returns Observable with the list of available models
   */
  getAvailableModels(): Observable<ModelsListResponse> {
    const url = `${this.baseUrl}/models`;
    const headers = this.createHeaders();

    return this.http.get<ModelsListResponse>(url, { headers })
      .pipe(
        map(response => {
          console.log(`📋 Retrieved ${response.data.total} available models`);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get information about a specific model
   * @param modelId - The ID of the model
   * @returns Observable with model information
   */
  getModelInfo(modelId: string): Observable<ApiResponse<AvailableModel>> {
    const url = `${this.baseUrl}/models/${modelId}`;
    const headers = this.createHeaders();

    return this.http.get<ApiResponse<AvailableModel>>(url, { headers })
      .pipe(
        map(response => {
          console.log(`ℹ️ Retrieved info for model '${modelId}'`);
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Upload file and invoke model (for multimodal models)
   * @param modelId - The ID of the model to invoke
   * @param payload - The data to send to the model
   * @param file - The file to upload
   * @param fieldName - The field name for the file (default: 'imageFile')
   * @returns Observable with the model response
   */
  invokeModelWithFile(
    modelId: string, 
    payload: ModelInvocationRequest, 
    file: File, 
    fieldName: string = 'imageFile'
  ): Observable<ModelInvocationResponse> {
    const url = `${this.baseUrl}/models/${modelId}/invoke`;
    const headers = this.createHeaders(false); // Don't set Content-Type for FormData

    // Create FormData for file upload
    const formData = new FormData();
    
    // Add file
    formData.append(fieldName, file, file.name);
    
    // Add other payload properties
    Object.keys(payload).forEach(key => {
      if (payload[key] !== null && payload[key] !== undefined) {
        formData.append(key, payload[key]);
      }
    });

    console.log(`📤 Uploading file to model '${modelId}'`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fieldName,
      timestamp: new Date().toISOString()
    });

    return this.http.post<ModelInvocationResponse>(url, formData, { headers })
      .pipe(
        map(response => {
          console.log(`✅ File upload to model '${modelId}' successful`, {
            success: response.success,
            processingTime: response.metadata?.processingTime,
            timestamp: new Date().toISOString()
          });
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Create HTTP headers with API key
   * @param includeContentType - Whether to include Content-Type header
   * @returns HttpHeaders object
   */
  private createHeaders(includeContentType: boolean = true): HttpHeaders {
    let headers = new HttpHeaders({
      'X-API-Key': this.apiKey
    });

    if (includeContentType) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  /**
   * Sanitize payload for logging (remove sensitive data)
   * @param payload - The payload to sanitize
   * @returns Sanitized payload
   */
  private sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const sanitized = { ...payload };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Truncate long strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 100) {
        sanitized[key] = sanitized[key].substring(0, 100) + '...';
      }
    });

    return sanitized;
  }

  /**
   * Handle HTTP errors
   * @param error - The HTTP error response
   * @returns Observable that throws the error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.error) {
        errorMessage = error.error.error.message || error.error.error;
      } else {
        errorMessage = `Server Error: ${error.status} - ${error.statusText}`;
      }
    }

    console.error(`❌ API Error`, {
      status: error.status,
      statusText: error.statusText,
      message: errorMessage,
      url: error.url,
      timestamp: new Date().toISOString()
    });

    return throwError(() => new Error(errorMessage));
  }
}
