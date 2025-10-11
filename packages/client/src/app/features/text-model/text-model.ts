import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService, ModelInvocationResponse } from '../../core/services/api';

@Component({
  selector: 'app-text-model',
  imports: [ReactiveFormsModule],
  templateUrl: './text-model.html',
  styleUrl: './text-model.scss'
})
export class TextModelComponent {
  private readonly apiService = inject(ApiService);

  // Signals for state management
  loading = signal(false);
  response = signal<ModelInvocationResponse | null>(null);
  error = signal<string | null>(null);

  // Reactive form
  textForm = new FormGroup({
    prompt: new FormControl('', [
      Validators.required,
      Validators.minLength(1),
      Validators.maxLength(8192)
    ]),
    maxTokens: new FormControl(256, [
      Validators.min(1),
      Validators.max(1024)
    ]),
    temperature: new FormControl(0.7, [
      Validators.min(0.0),
      Validators.max(1.0)
    ]),
    topP: new FormControl(0.9, [
      Validators.min(0.0),
      Validators.max(1.0)
    ]),
    topK: new FormControl(40, [
      Validators.min(1),
      Validators.max(100)
    ])
  });

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.textForm.valid) {
      this.invokeTextModel();
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Invoke the text model with form data
   */
  private invokeTextModel(): void {
    const formValue = this.textForm.value;
    
    // Reset state
    this.loading.set(true);
    this.response.set(null);
    this.error.set(null);

    // Prepare payload
    const payload = {
      prompt: formValue.prompt,
      maxTokens: formValue.maxTokens,
      temperature: formValue.temperature,
      topP: formValue.topP,
      topK: formValue.topK
    };

    // Call API service
    this.apiService.invokeModel('google-text-bison', payload)
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.response.set(response);
          console.log('Text model response:', response);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(error.message || 'An error occurred while processing the request');
          console.error('Text model error:', error);
        }
      });
  }

  /**
   * Mark all form controls as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.textForm.controls).forEach(key => {
      const control = this.textForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Reset the form and clear state
   */
  resetForm(): void {
    this.textForm.reset({
      prompt: '',
      maxTokens: 256,
      temperature: 0.7,
      topP: 0.9,
      topK: 40
    });
    this.response.set(null);
    this.error.set(null);
  }

  /**
   * Get validation error message for a form control
   * @param controlName - Name of the form control
   * @returns Error message or null
   */
  getErrorMessage(controlName: string): string | null {
    const control = this.textForm.get(controlName);
    
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${controlName} is required`;
      }
      if (control.errors['minlength']) {
        return `${controlName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
      if (control.errors['maxlength']) {
        return `${controlName} must not exceed ${control.errors['maxlength'].requiredLength} characters`;
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
    const control = this.textForm.get(controlName);
    return !!(control?.errors && control.touched);
  }
}
