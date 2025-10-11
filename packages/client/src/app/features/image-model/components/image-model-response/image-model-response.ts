import { Component, Input } from '@angular/core';
import { ModelInvocationResponse } from '../../../../core/services/api';

@Component({
  selector: 'app-image-model-response',
  imports: [],
  templateUrl: './image-model-response.html',
  styleUrl: './image-model-response.scss'
})
export class ImageModelResponseComponent {
  @Input() response: ModelInvocationResponse | null = null;

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

