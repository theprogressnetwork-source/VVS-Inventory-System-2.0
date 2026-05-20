// ============================================================
// VVS IMS — Auth Guard (Migrated)
// CRITICAL-009 FIX: Observable-based auth check with silent refresh
// Pattern: Check in-memory token → Attempt refresh → Redirect
// ============================================================
import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { of, from, switchMap, catchError, map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ── Step 1: Check in-memory token (synchronous fast path) ───
  if (authService.isAuthenticated()) {
    return true;
  }

  // ── Step 2: Attempt silent refresh via httpOnly cookie ──────
  return authService.refreshToken().pipe(
    switchMap((response) => {
      if (response?.accessToken) {
        return of(true);
      }
      // Refresh succeeded but no token → force login
      authService.clearSession();
      return of(
        router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url },
        })
      );
    }),
    catchError(() => {
      // Refresh failed → redirect to login
      authService.clearSession();
      return of(
        router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url },
        })
      );
    })
  );
};
