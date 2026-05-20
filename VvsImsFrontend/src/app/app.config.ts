// ============================================================
// VVS IMS — App Configuration (Migrated)
// FIX: Removed AppGlobal class provider (replaced with API_ROUTES const).
// FIX: Added withInterceptorsFromDi() for future HTTP interceptor support.
// ============================================================
import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading, withRouterConfig, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { HttpClient, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { Keepalive } from '@ng-idle/keepalive';
import { provideNgIdle } from '@ng-idle/core';
import { provideToastr } from 'ngx-toastr';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { provideAnimations } from '@angular/platform-browser/animations';

export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, './i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(NgxSkeletonLoaderModule),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // ── HTTP Client with credentials support + interceptor DI ──
    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi()
    ),
    provideRouter(
      routes,
      withViewTransitions(),
      withPreloading(PreloadAllModules),
      withRouterConfig({ onSameUrlNavigation: 'reload' })
    ),
    importProvidersFrom([
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),
    ]),
    provideAnimations(),
    provideToastr({
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
    }),
    // ── AppGlobal class REMOVED — use API_ROUTES const import instead ──
    { provide: API_ROUTES_TOKEN, useValue: API_ROUTES },
    ApiService, Keepalive, provideNgIdle(),
  ],
};
