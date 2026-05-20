// ============================================================
// VVS IMS — Auth Service (Migrated)
// CRITICAL-009 FIX: localStorage → httpOnly Cookie + In-Memory Token
// Pattern: Access token in memory (BehaviorSubject),
//          Refresh token in httpOnly cookie (server-managed)
// ============================================================
import { Injectable } from '@angular/core';
import { Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, catchError, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    userName: string;
    roleName: string;
    roleId: number;
    message: string;
}

export interface RefreshResponse {
    accessToken: string;
    message?: string;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly API_URL = environment.apiUrl;

    // ── In-Memory Token Storage (NOT localStorage) ──────────────
    private accessTokenSubject = new BehaviorSubject<string | null>(null);
    public accessToken$ = this.accessTokenSubject.asObservable();

    // ── Derived Auth State ──────────────────────────────────────
    public isAuthenticated$: Observable<boolean> = this.accessToken$.pipe(
        map((token) => token !== null && token.length > zero)
    );

    // ── User Metadata (non-sensitive, OK in memory) ─────────────
    private userNameSubject = new BehaviorSubject<string | null>(null);
    public userName$ = this.userNameSubject.asObservable();

    private userRoleSubject = new BehaviorSubject<string | null>(null);
    public userRole$ = this.userRoleSubject.asObservable();

    private roleIdSubject = new BehaviorSubject<number | null>(null);
    public roleId$ = this.roleIdSubject.asObservable();

    // ── Refresh Lock (prevent concurrent refresh calls) ─────────
    private isRefreshing = false;
    private refreshSubject = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient) { }

    // ────────────────────────────────────────────────────────────
    // LOGIN — POST /api/auth/login
    // Backend sets httpOnly cookie for refresh token automatically.
    // Access token returned in response body → stored in memory.
    // ────────────────────────────────────────────────────────────
    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http
            .post<LoginResponse>(`${this.API_URL}/auth/login`, credentials, {
                withCredentials: true, // ← Ensures httpOnly cookie is sent/received
            })
            .pipe(
                tap((response) => {
                    this.setSession(response);
                })
            );
    }

    // ────────────────────────────────────────────────────────────
    // SILENT REFRESH — POST /api/auth/refresh
    // No body needed — httpOnly cookie is sent automatically
    // via withCredentials: true.
    // ────────────────────────────────────────────────────────────
    refreshToken(): Observable<RefreshResponse | null> {
        if (this.isRefreshing) {
            // If a refresh is already in flight, wait for it
            return new Observable((subscriber) => {
                const sub = this.refreshSubject.subscribe((done) => {
                    if (done) {
                        subscriber.next(null);
                        subscriber.complete();
                        sub.unsubscribe();
                    }
                });
            });
        }

        this.isRefreshing = true;
        this.refreshSubject.next(false);

        return this.http
            .post<RefreshResponse>(
                `${this.API_URL}/auth/refresh`,
                {},
                { withCredentials: true }
            )
            .pipe(
                tap((response) => {
                    this.accessTokenSubject.next(response.accessToken);
                    this.isRefreshing = false;
                    this.refreshSubject.next(true);
                }),
                catchError((error) => {
                    this.clearSession();
                    this.isRefreshing = false;
                    this.refreshSubject.next(true);
                    throw error;
                })
            );
    }

    // ────────────────────────────────────────────────────────────
    // LOGOUT — POST /api/auth/logout
    // Clears server-side httpOnly cookie + in-memory token.
    // ────────────────────────────────────────────────────────────
    logout(): Observable<any> {
        return this.http
            .post(`${this.API_URL}/auth/logout`, {}, { withCredentials: true })
            .pipe(
                tap(() => {
                    this.clearSession();
                }),
                catchError(() => {
                    // Even if the server logout fails, clear local state
                    this.clearSession();
                    return of(null);
                })
            );
    }

    // ────────────────────────────────────────────────────────────
    // SESSION MANAGEMENT (Internal)
    // ────────────────────────────────────────────────────────────
    private setSession(response: LoginResponse): void {
        this.accessTokenSubject.next(response.accessToken);
        this.userNameSubject.next(response.userName);
        this.userRoleSubject.next(response.roleName);
        this.roleIdSubject.next(response.roleId);
    }

    clearSession(): void {
        this.accessTokenSubject.next(null);
        this.userNameSubject.next(null);
        this.userRoleSubject.next(null);
        this.roleIdSubject.next(null);
    }

    // ────────────────────────────────────────────────────────────
    // GETTERS (Synchronous access for interceptor)
    // ────────────────────────────────────────────────────────────
    getAccessToken(): string | null {
        return this.accessTokenSubject.value;
    }

    isAuthenticated(): boolean {
      const token = this.accessTokenSubject.value;
      return token !== null && token.length > zero;
    }
  
    // Alias for app.component.ts compatibility
    hasValidSession(): boolean {
      return this.isAuthenticated();
    }

    getCurrentUserRole(): number | null {
        return this.roleIdSubject.value;
    }

    getUserName(): string | null {
        return this.userNameSubject.value;
    }

    getRoleName(): string | null {
        return this.userRoleSubject.value;
    }
}

// ── Numeric constant for readability + TTS phonetic clarity ────
const zero: number = 0;
