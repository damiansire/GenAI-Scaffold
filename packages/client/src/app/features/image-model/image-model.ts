import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService, ModelInvocationResponse } from '../../core/services/api';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload';
import { ImageModelFormComponent } from './components/image-model-form/image-model-form';
import { ImageModelResponseComponent } from './components/image-model-response/image-model-response';
import { ModelResponseComponent } from '../../shared/components/model-response/model-response';

@Component({
  selector: 'app-image-model',
  imports: [FileUploadComponent, ImageModelFormComponent, ImageModelResponseComponent, ModelResponseComponent],
  templateUrl: './image-model.html',
  styleUrl: './image-model.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageModelComponent {
  private readonly apiService = inject(ApiService);

  // Signals for state management
  loading = signal(false);
  response = signal<ModelInvocationResponse | null>(null);
  error = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  // Reactive form
  imageForm = new FormGroup({
    language: new FormControl('en', [
      Validators.required,
      Validators.pattern(/^[a-z]{2}(-[A-Z]{2})?$/)
    ]),
    maxResults: new FormControl(10, [
      Validators.min(1),
      Validators.max(100)
    ]),
    confidenceThreshold: new FormControl(0.8, [
      Validators.min(0.0),
      Validators.max(1.0)
    ]),
    includeBoundingBoxes: new FormControl(true),
    outputFormat: new FormControl('structured', [
      Validators.required
    ])
  });

  /**
   * Handle file selection
   */
  onFileSelected(file: File): void {
    this.selectedFile.set(file);
    this.error.set(null);
    
    console.log('File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
  }

  /**
   * Handle file cleared
   */
  onFileCleared(): void {
    this.selectedFile.set(null);
    this.error.set(null);
  }

  /**
   * Handle file upload error
   */
  onFileError(errorMessage: string): void {
    this.error.set(errorMessage);
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    const formValue = this.imageForm.value;
    const file = this.selectedFile();
    
    if (!file) {
      this.error.set('No file selected');
      return;
    }

    // Reset state
    this.loading.set(true);
    this.response.set(null);
    this.error.set(null);

    // Prepare payload (text fields only)
    const payload = {
      language: formValue.language,
      maxResults: formValue.maxResults,
      confidenceThreshold: formValue.confidenceThreshold,
      includeBoundingBoxes: formValue.includeBoundingBoxes,
      outputFormat: formValue.outputFormat
    };

    console.log('Invoking image model with:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      payload
    });

    // Call API service with file upload
    this.apiService.invokeModelWithFile('google-vision-ocr', payload, file, 'imageFile')
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.response.set(response);
          console.log('Image model response:', response);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(error.message || 'An error occurred while processing the image');
          console.error('Image model error:', error);
        }
      });
  }

  /**
   * Reset the form and clear state
   */
  resetForm(): void {
    this.imageForm.reset({
      language: 'en',
      maxResults: 10,
      confidenceThreshold: 0.8,
      includeBoundingBoxes: true,
      outputFormat: 'structured'
    });
    this.selectedFile.set(null);
    this.response.set(null);
    this.error.set(null);
  }
}
