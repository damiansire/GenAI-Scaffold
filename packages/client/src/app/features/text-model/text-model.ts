import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService, ModelInvocationResponse } from '../../core/services/api';
import { TextModelFormComponent } from './components/text-model-form/text-model-form';
import { TextModelResponseComponent } from './components/text-model-response/text-model-response';
import { ModelResponseComponent } from '../../shared/components/model-response/model-response';

@Component({
  selector: 'app-text-model',
  imports: [TextModelFormComponent, TextModelResponseComponent, ModelResponseComponent],
  templateUrl: './text-model.html',
  styleUrl: './text-model.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
}
