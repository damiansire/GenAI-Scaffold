import { Component, Input } from '@angular/core';
import { ModelInvocationResponse } from '../../../../core/services/api';

@Component({
  selector: 'app-text-model-response',
  imports: [],
  templateUrl: './text-model-response.html',
  styleUrl: './text-model-response.scss'
})
export class TextModelResponseComponent {
  @Input() response: ModelInvocationResponse | null = null;
}

