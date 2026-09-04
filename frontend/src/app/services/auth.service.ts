import { Injectable, signal, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const API_URL = 'http://localhost:3000/api/auth';

export interface AuthUser {
  id: number;
  username: string;
  role: 'ADMIN' | 'USER';
  email?: string | null;
  picture?: string | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private logoutTimer: ReturnType<typeof setTimeout> | undefined;
  private isRefreshing = false;
  private lastActivityCheck = 0;
  private activityListenersBound = false;
  private readonly activityEvents = [
    'mousemove', 'mousedown', 'keydown',
    'touchstart', 'scroll', 'click'
  ];

  sessionMessage = signal<string>('');

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone
  ) {
    const token = localStorage.getItem('token');
    if (token && !this.isTokenExpired()) {
      this.scheduleAutoLogout(token);
      this.setupActivityListeners();
    }
  }

  clearSessionMessage = (): void => {
    this.sessionMessage.set('');
  };

  login = (username: string, password: string): Observable<LoginResponse> => {
    return this.http.post<LoginResponse>(`${API_URL}/login`, { username, password }).pipe(
      tap((res) => {
        if (res.success && res.token && res.user) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.sessionMessage.set('Se ha iniciado sesión');
          this.scheduleAutoLogout(res.token);
          this.setupActivityListeners();
        }
      })
    );
  };

  loginWithGoogle = (credential: string): Observable<LoginResponse> => {
    return this.http.post<LoginResponse>(`${API_URL}/google`, { credential }).pipe(
      tap((res) => {
        if (res.success && res.token && res.user) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.sessionMessage.set('Se ha iniciado sesión con Google');
          this.scheduleAutoLogout(res.token);
          this.setupActivityListeners();
        }
      })
    );
  };

  getGoogleClientId = (): Observable<{ clientId: string | null }> => {
    return this.http.get<{ clientId: string | null }>(`${API_URL}/google/client-id`);
  };

  refreshToken = (): Observable<LoginResponse> => {
    return this.http.post<LoginResponse>(`${API_URL}/refresh`, {}).pipe(
      tap((res) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
          this.scheduleAutoLogout(res.token);
        }
      })
    );
  };

  logout = (message = 'Sesión cerrada'): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.removeActivityListeners();
    this.sessionMessage.set(message);
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = undefined;
    }
  };

  onSessionExpired = (): void => {
    this.logout('La sesión ha expirado.');
    this.router.navigate(['/login']);
  };

  isLoggedIn = (): boolean => {
    if (!localStorage.getItem('token')) return false;
    if (this.isTokenExpired()) {
      this.logout('Sesión expirada');
      return false;
    }
    return true;
  };

  getRole = (): string | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).role : null;
  };

  getTokenExpiration = (token: string): number | null => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.exp ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  };

  isTokenExpired = (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) return true;
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    return Date.now() >= expiration;
  };

  scheduleAutoLogout = (token: string): void => {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return;

    const msUntilExpiration = expiration - Date.now();

    if (this.logoutTimer) clearTimeout(this.logoutTimer);

    if (msUntilExpiration <= 0) {
      this.logout('Sesión expirada');
      this.router.navigate(['/login']);
      return;
    }

    this.logoutTimer = setTimeout(() => {
      this.logout('Sesión expirada');
      this.router.navigate(['/login']);
    }, msUntilExpiration);
  };

  getTokenDuration = (token: string): number | null => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.exp && decoded.iat ? (decoded.exp - decoded.iat) * 1000 : null;
    } catch {
      return null;
    }
  };

  recordActivity = (): void => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const now = Date.now();
    // Throttle: solo verificar una vez cada 5 segundos
    if (now - this.lastActivityCheck < 5000) return;
    this.lastActivityCheck = now;

    if (this.isTokenExpired()) {
      this.logout('Sesión expirada');
      this.router.navigate(['/login']);
      return;
    }

    const expiration = this.getTokenExpiration(token);
    if (!expiration) return;

    const msUntilExpiration = expiration - now;
    const totalDuration = this.getTokenDuration(token);
    // Renovar solo si queda menos del 25% del tiempo del token (máximo 4 minutos)
    const refreshThreshold = totalDuration ? Math.min(240000, totalDuration * 0.25) : 240000;

    if (msUntilExpiration < refreshThreshold && !this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshToken().subscribe({
        next: () => { this.isRefreshing = false; },
        error: () => { this.isRefreshing = false; }
      });
    }
  };

  private setupActivityListeners = (): void => {
    if (this.activityListenersBound || typeof window === 'undefined') return;
    this.activityListenersBound = true;
    this.ngZone.runOutsideAngular(() => {
      for (const evt of this.activityEvents) {
        window.addEventListener(evt, this.onUserActivity, { passive: true });
      }
    });
  };

  private removeActivityListeners = (): void => {
    if (!this.activityListenersBound || typeof window === 'undefined') return;
    this.activityListenersBound = false;
    for (const evt of this.activityEvents) {
      window.removeEventListener(evt, this.onUserActivity);
    }
  };

  private onUserActivity = (): void => {
    this.recordActivity();
  };
}
