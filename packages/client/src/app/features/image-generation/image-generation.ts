import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ModelInvocationResponse } from '../../core/services/api';
import { ModelResponseComponent } from '../../shared/components/model-response/model-response';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload';

@Component({
  selector: 'app-image-generation',
  imports: [
    ReactiveFormsModule,
    ModelResponseComponent,
    FileUploadComponent
  ],
  templateUrl: './image-generation.html',
  styleUrl: './image-generation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageGenerationComponent {
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api';
  private readonly apiKey = environment.apiKey || '';

  // Signals for state management
  selectedFiles = signal<File[]>([]);
  fileError = signal<string | null>(null);
  generationMode = signal<'text-to-image' | 'image-editing'>('text-to-image');

  // Request signal to trigger API calls
  requestParams = signal<{
    prompt: string;
    aspectRatio: string;
    responseModalities: string[];
    inputImages?: Array<{ data: string; mimeType: string }>;
  } | undefined>(undefined);

  // HttpResource for reactive HTTP calls
  imageGenResource = httpResource<ModelInvocationResponse>(() => {
    const params = this.requestParams();
    if (!params) {
      return { url: '' };
    }
    
    console.log('Gemini Image Generation request:', params);
    return {
      url: `${this.baseUrl}/models/gemini-image-gen/invoke`,
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    };
  });

  // Reactive form
  imageGenForm = new FormGroup({
    prompt: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(8192)
    ]),
    aspectRatio: new FormControl('1:1', [Validators.required]),
    responseModalities: new FormControl(['Image', 'Text'])
  });

  aspectRatios = [
    { value: '1:1', label: 'Square (1:1)', resolution: '1024×1024' },
    { value: '2:3', label: 'Portrait (2:3)', resolution: '832×1248' },
    { value: '3:2', label: 'Landscape (3:2)', resolution: '1248×832' },
    { value: '16:9', label: 'Widescreen (16:9)', resolution: '1344×768' },
    { value: '9:16', label: 'Mobile (9:16)', resolution: '768×1344' },
    { value: '4:3', label: 'Classic (4:3)', resolution: '1184×864' },
    { value: '21:9', label: 'Ultrawide (21:9)', resolution: '1536×672' }
  ];

  examples = [
    {
      category: 'Photorealistic',
      prompt: 'A photorealistic close-up portrait of an elderly Japanese ceramicist with deep wrinkles and a warm smile, inspecting a freshly glazed tea bowl in his rustic workshop. Soft golden hour light streaming through a window, 85mm portrait lens with bokeh.'
    },
    {
      category: 'Illustration',
      prompt: 'A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat, munching on a green bamboo leaf. Bold clean outlines, cel-shading, vibrant colors. White background.'
    },
    {
      category: 'Product',
      prompt: 'A high-resolution studio-lit photograph of a minimalist ceramic coffee mug in matte black on polished concrete. Three-point softbox lighting, 45-degree angle, ultra-realistic with steam rising.'
    },
    {
      category: 'Logo',
      prompt: 'Create a modern minimalist logo for a coffee shop called "The Daily Grind". Clean bold sans-serif font with a stylized coffee bean icon. Black and white color scheme.'
    },
    {
      category: 'Comic',
      prompt: 'A gritty noir comic panel with high-contrast black and white. Detective in trench coat under flickering streetlamp in rain. Neon bar sign reflecting in puddle. Caption box: "The city keeps no secrets."'
    }
  ];

  /**
   * Handle file selection for image editing
   */
  onFileSelected(file: File): void {
    this.selectedFiles.update(files => [...files, file]);
    this.fileError.set(null);
    this.generationMode.set('image-editing');
  }

  /**
   * Handle file cleared
   */
  onFileCleared(): void {
    this.selectedFiles.set([]);
    this.fileError.set(null);
    this.generationMode.set('text-to-image');
  }

  /**
   * Handle file upload error
   */
  onFileError(errorMessage: string): void {
    this.fileError.set(errorMessage);
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.imageGenForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.imageGenForm.value;
    
    // Convert uploaded images to base64 if any
    const inputImages = await this.convertFilesToBase64(this.selectedFiles());

    // Update request params to trigger resource loading
    this.requestParams.set({
      prompt: formValue.prompt!,
      aspectRatio: formValue.aspectRatio!,
      responseModalities: formValue.responseModalities!,
      inputImages: inputImages.length > 0 ? inputImages : undefined
    });
  }

  /**
   * Convert files to base64 for API
   */
  private async convertFilesToBase64(files: File[]): Promise<Array<{ data: string; mimeType: string }>> {
    const promises = files.map(async (file) => {
      const base64 = await this.fileToBase64(file);
      return {
        data: base64.split(',')[1], // Remove data:image/png;base64, prefix
        mimeType: file.type
      };
    });
    
    return Promise.all(promises);
  }

  /**
   * Convert file to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Mark all form controls as touched
   */
  private markFormGroupTouched(): void {
    Object.keys(this.imageGenForm.controls).forEach(key => {
      const control = this.imageGenForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Reset the form and clear state
   */
  resetForm(): void {
    this.imageGenForm.reset({
      prompt: '',
      aspectRatio: '1:1',
      responseModalities: ['Image', 'Text']
    });
    this.selectedFiles.set([]);
    this.fileError.set(null);
    this.requestParams.set(undefined);
    this.generationMode.set('text-to-image');
  }

  /**
   * Set example prompt
   */
  setExamplePrompt(example: string): void {
    this.imageGenForm.patchValue({ prompt: example });
  }

  /**
   * Get error message for form control
   */
  getErrorMessage(controlName: string): string | null {
    const control = this.imageGenForm.get(controlName);
    
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${controlName} is required`;
      if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    }
    
    return null;
  }

  /**
   * Check if form control has error
   */
  hasError(controlName: string): boolean {
    const control = this.imageGenForm.get(controlName);
    return !!(control?.errors && control.touched);
  }
}
