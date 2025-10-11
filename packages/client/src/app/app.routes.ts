import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/text-model',
    pathMatch: 'full'
  },
  {
    path: 'text-model',
    loadComponent: () => import('./features/text-model/text-model').then(m => m.TextModelComponent),
    title: 'Text Generation - AI Gateway'
  },
  {
    path: 'image-ocr',
    loadComponent: () => import('./features/image-model/image-model').then(m => m.ImageModelComponent),
    title: 'Image OCR - AI Gateway'
  },
  {
    path: 'image-generation',
    loadComponent: () => import('./features/image-generation/image-generation').then(m => m.ImageGenerationComponent),
    title: 'Image Generation - Nano Banana'
  },
  // Legacy redirect
  {
    path: 'image-model',
    redirectTo: '/image-ocr'
  },
  {
    path: '**',
    redirectTo: '/text-model'
  }
];
