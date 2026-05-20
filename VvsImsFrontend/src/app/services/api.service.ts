// ============================================================
// VVS IMS — API Service (Migrated)
// CRITICAL-008 FIX: Base URL from environment (NOT hardcoded IP)
// CRITICAL-009 FIX: Token from in-memory BehaviorSubject (NOT localStorage)
// All requests include withCredentials: true for cookie-based refresh.
// 401 → Silent refresh via httpOnly cookie → Retry original request.
// ============================================================
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Observable,
  throwError,
  from,
  switchMap,
  catchError,
  tap,
  of,
  Subject,
  map,
  OperatorFunction,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly API_URL = environment.apiUrl;

  // ── Refresh deduplication ───────────────────────────────────
  private isRefreshing = false;
  private refreshQueue = new Subject<boolean>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  // ────────────────────────────────────────────────────────────
  // CORRELATION ID — Traceability across the Sovereign Stack
  // ────────────────────────────────────────────────────────────
  private createCorrelationId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    const now = Date.now().toString(sixteen);
    const rand = Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER
    ).toString(sixteen);
    return `${now}${rand}`;
  }

  // ────────────────────────────────────────────────────────────
  // HEADER BUILDER — Token from in-memory BehaviorSubject
  // ────────────────────────────────────────────────────────────
  private buildHeaders(
    includeContentType: boolean = true,
    extraHeaders?: Record<string, string>
  ): HttpHeaders {
    const token = this.authService.getAccessToken();
    const baseHeaders: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-correlation-id': this.createCorrelationId(),
      ...(extraHeaders || {}),
    };

    if (includeContentType) {
      baseHeaders['Content-Type'] = 'application/json';
    }

    return new HttpHeaders(baseHeaders);
  }

  // ────────────────────────────────────────────────────────────
  // 401 HANDLER — Silent refresh → Retry → Logout
  // ────────────────────────────────────────────────────────────
  private handle401<T>(requestFn: () => Observable<T>): Observable<T> {
    if (this.isRefreshing) {
      // Queue: wait for the in-flight refresh to complete
      return new Observable<T>((subscriber) => {
        const sub = this.refreshQueue.subscribe((success) => {
          if (success) {
            requestFn().subscribe(subscriber);
          } else {
            subscriber.error(new Error('Refresh failed'));
          }
          sub.unsubscribe();
        });
      });
    }

    this.isRefreshing = true;

    return this.authService.refreshToken().pipe(
      switchMap((response) => {
        this.isRefreshing = false;
        this.refreshQueue.next(true);
        if (response?.accessToken) {
          return requestFn();
        }
        this.forceLogout();
        return throwError(() => new Error('Session expired'));
      }),
      catchError((error) => {
        this.isRefreshing = false;
        this.refreshQueue.next(false);
        this.forceLogout();
        return throwError(() => error);
      })
    );
  }

  private forceLogout(): void {
    this.authService.clearSession();
    this.router.navigate(['/login'], {
      queryParams: { reason: 'session_expired' },
    });
  }

  // ────────────────────────────────────────────────────────────
  // API RESPONSE UNWRAP — Backend returns { success, message, data }
  // Frontend components expect raw arrays/objects. This operator
  // extracts the .data field from the ApiResponse<T> envelope.
  // If the response is NOT wrapped (e.g., auth), it passes through.
  // ────────────────────────────────────────────────────────────
  private unwrapResponse<T>(): OperatorFunction<any, T> {
    return map((response: any) => {
      if (
        response &&
        typeof response === 'object' &&
        'success' in response &&
        'data' in response
      ) {
        return response.data as T;
      }
      return response as T;
    });
  }

  // ────────────────────────────────────────────────────────────
  // HTTP METHODS — All with withCredentials: true
  // ────────────────────────────────────────────────────────────

  /** GET request — unwraps ApiResponse<T>.data */
  getData<T>(
    endpoint: string,
    extraHeaders?: Record<string, string>
  ): Observable<T> {
    const headers = this.buildHeaders(true, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.get<T>(url, { headers, withCredentials: true });

    return requestFn().pipe(
      this.unwrapResponse<T>(),
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(requestFn);
        }
        return throwError(() => error);
      })
    );
  }

  /** GET request (text response) */
  getTextData(
    endpoint: string,
    extraHeaders?: Record<string, string>
  ): Observable<string> {
    const headers = this.buildHeaders(true, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.get(url, {
        headers,
        responseType: 'text',
        withCredentials: true,
      });

    return requestFn().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(requestFn) as Observable<string>;
        }
        return throwError(() => error);
      })
    );
  }

  /** POST request — unwraps ApiResponse<T>.data */
  postData<T>(
    endpoint: string,
    data: any,
    extraHeaders?: Record<string, string>
  ): Observable<T> {
    const headers = this.buildHeaders(true, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.post<T>(url, data, { headers, withCredentials: true });

    return requestFn().pipe(
      this.unwrapResponse<T>(),
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(requestFn);
        }
        return throwError(() => error);
      })
    );
  }

  /** POST request (absolute URL — for external integrations) */
  postAbsoluteData<T>(
    url: string,
    data: any,
    extraHeaders?: Record<string, string>
  ): Observable<T> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-correlation-id': this.createCorrelationId(),
      ...(extraHeaders || {}),
    });
    return this.http.post<T>(url, data, { headers });
  }

  /** GET request with query params — unwraps ApiResponse<T>.data */
  getDataWithParams<T>(
    endpoint: string,
    params?: any,
    extraHeaders?: Record<string, string>
  ): Observable<T> {
    const headers = this.buildHeaders(true, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;

    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (
          params[key] !== null &&
          params[key] !== undefined &&
          params[key] !== ''
        ) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    const requestFn = () =>
      this.http.get<T>(url, {
        headers,
        params: httpParams,
        withCredentials: true,
      });

    return requestFn().pipe(
      this.unwrapResponse<T>(),
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(requestFn);
        }
        return throwError(() => error);
      })
    );
  }

  /** PUT request — unwraps ApiResponse<T>.data */
  putData<T>(
    endpoint: string,
    data: any,
    extraHeaders?: Record<string, string>
  ): Observable<T> {
    const headers = this.buildHeaders(true, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.put<T>(url, data, { headers, withCredentials: true });

    return requestFn().pipe(
      this.unwrapResponse<T>(),
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(requestFn);
        }
        return throwError(() => error);
      })
    );
  }

  /** DELETE request — unwraps ApiResponse<T>.data */
  deleteData<T>(
    endpoint: string,
    extraHeaders?: Record<string, string>
  ): Observable<T> {
    const headers = this.buildHeaders(true, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.delete<T>(url, { headers, withCredentials: true });

    return requestFn().pipe(
      this.unwrapResponse<T>(),
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(requestFn);
        }
        return throwError(() => error);
      })
    );
  }

  /** Soft-delete via POST (legacy pattern) — unwraps ApiResponse<T>.data */
  removeData<T>(
    endpoint: string,
    extraHeaders?: Record<string, string>
  ): Observable<T> {
    const headers = this.buildHeaders(true, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.post<T>(url, {}, { headers, withCredentials: true });

    return requestFn().pipe(
      this.unwrapResponse<T>(),
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(requestFn);
        }
        return throwError(() => error);
      })
    );
  }

  /** POST with FormData (file uploads) — unwraps ApiResponse<T>.data */
  postDataForm<T>(
    endpoint: string,
    formData: FormData,
    extraHeaders?: Record<string, string>
  ): Observable<T> {
    const headers = this.buildHeaders(false, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.post<T>(url, formData, {
        headers,
        withCredentials: true,
      });

    return requestFn().pipe(
      this.unwrapResponse<T>(),
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(requestFn);
        }
        return throwError(() => error);
      })
    );
  }

  /** POST with FormData → Blob response (file downloads) */
  postDataFormBlob(
    endpoint: string,
    formData: FormData,
    extraHeaders?: Record<string, string>
  ): Observable<HttpResponse<Blob>> {
    const headers = this.buildHeaders(false, extraHeaders);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.post(url, formData, {
        headers,
        observe: 'response',
        responseType: 'blob',
        withCredentials: true,
      });

    return requestFn().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(
            requestFn
          ) as Observable<HttpResponse<Blob>>;
        }
        return throwError(() => error);
      })
    );
  }

  /** GET → Blob download */
  downloadFile(
    endpoint: string,
    params?: Record<string, any>
  ): Observable<HttpResponse<Blob>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((k) => {
        const v = params[k];
        if (v !== undefined && v !== null)
          httpParams = httpParams.set(k, String(v));
      });
    }

    const headers = this.buildHeaders(false);
    const url = `${this.API_URL}${endpoint}`;
    const requestFn = () =>
      this.http.get(url, {
        headers,
        params: httpParams,
        observe: 'response',
        responseType: 'blob',
        withCredentials: true,
      }) as Observable<HttpResponse<Blob>>;

    return requestFn().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === fourOhOne) {
          return this.handle401(
            requestFn
          ) as Observable<HttpResponse<Blob>>;
        }
        return throwError(() => error);
      })
    );
  }
}

// ── Numeric constants for TTS phonetic clarity ────────────────
const sixteen: number = 16;
const fourOhOne: number = 401;
