import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService, ModelInvocationResponse } from '../../core/services/api';

@Component({
  selector: 'app-image-model',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './image-model.html',
  styleUrl: './image-model.scss'
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

  // File input reference
  fileInput: HTMLInputElement | null = null;

  /**
   * Handle file selection
   * @param event - File input change event
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
      if (!allowedTypes.includes(file.type)) {
        this.error.set('Please select a valid image file (JPEG, PNG, GIF, WEBP, or BMP)');
        return;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.error.set('File size must not exceed 10MB');
        return;
      }

      this.selectedFile.set(file);
      this.error.set(null);
      
      console.log('File selected:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.imageForm.valid && this.selectedFile()) {
      this.invokeImageModel();
    } else {
      this.markFormGroupTouched();
      
      if (!this.selectedFile()) {
        this.error.set('Please select an image file');
      }
    }
  }

  /**
   * Invoke the image model with form data and file
   */
  private invokeImageModel(): void {
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
   * Clear selected file
   */
  clearFile(): void {
    this.selectedFile.set(null);
    this.error.set(null);
    
    // Reset file input
    if (this.fileInput) {
      this.fileInput.value = '';
    }
  }

  /**
   * Mark all form controls as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.imageForm.controls).forEach(key => {
      const control = this.imageForm.get(key);
      control?.markAsTouched();
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
    this.clearFile();
    this.response.set(null);
    this.error.set(null);
  }

  /**
   * Get validation error message for a form control
   * @param controlName - Name of the form control
   * @returns Error message or null
   */
  getErrorMessage(controlName: string): string | null {
    const control = this.imageForm.get(controlName);
    
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${controlName} is required`;
      }
      if (control.errors['pattern']) {
        return `${controlName} format is invalid`;
      }
      if (control.errors['min']) {
        return `${controlName} must be at least ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `${controlName} must not exceed ${control.errors['max'].max}`;
      }
    }
    
    return null;
  }

  /**
   * Check if a form control has validation errors
   * @param controlName - Name of the form control
   * @returns True if control has errors and is touched
   */
  hasError(controlName: string): boolean {
    const control = this.imageForm.get(controlName);
    return !!(control?.errors && control.touched);
  }

  /**
   * Format file size for display
   * @param bytes - File size in bytes
   * @returns Formatted file size string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon based on MIME type
   * @param mimeType - File MIME type
   * @returns Icon emoji
   */
  getFileTypeIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    }
    return '📄';
  }
}
