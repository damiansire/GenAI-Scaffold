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
    title: 'Text Model - AI Gateway'
  },
  {
    path: 'image-model',
    loadComponent: () => import('./features/image-model/image-model').then(m => m.ImageModelComponent),
    title: 'Image Model - AI Gateway'
  },
  {
    path: '**',
    redirectTo: '/text-model'
  }
];
