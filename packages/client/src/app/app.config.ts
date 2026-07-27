import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { environment } from '../environments/environment';
import { API_CONFIG } from './core/tokens/api-config';
import { apiKeyInterceptor } from './core/interceptors/api-key.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(withFetch(), withInterceptors([apiKeyInterceptor])),
    {
      provide: API_CONFIG,
      // Both values come from the environment file the build selected: the
      // production build swaps in `environment.prod.ts` (same-origin `/api`, no
      // key). A hardcoded `http://localhost:3000` fallback used to live here and
      // ended up compiled into the production bundle.
      useValue: {
        baseUrl: environment.apiUrl,
        apiKey: environment.apiKey ?? '',
      },
    },
  ],
};
