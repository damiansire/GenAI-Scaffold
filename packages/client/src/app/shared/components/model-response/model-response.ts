import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModelInvocationResponse } from '../../../core/services/api';

@Component({
  selector: 'app-model-response',
  imports: [DatePipe],
  templateUrl: './model-response.html',
  styleUrl: './model-response.scss'
})
export class ModelResponseComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() response: ModelInvocationResponse | null = null;
  @Input() loadingMessage = 'Processing...';
}

