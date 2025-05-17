import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { LoginDTO } from '../_models/LoginDTO';

import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, take, throwError } from 'rxjs';
import { LoginResponseDTO } from '../_models/LoginResponseDTO';
import { TokenResponseDTO } from '../_models/TokenResponseDTO';
import { RegisterDTO } from '../_models/RegisterDTO';
import { PresenceService } from './presence.service';
import { NotificationsService } from './notifications.service';
import { handleError } from '../_utils/error.handler';


@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private baseUrl = environment.apiUrl;
  private refreshTokenTimeout: any; 
  private _currentUser = signal<LoginResponseDTO | null>(null);
  public get currentUser() {
    return this._currentUser.asReadonly();
  }

  private _isRefreshingToken = signal<boolean>(false);
  public get isRefreshingToken() {
    return this._isRefreshingToken.asReadonly();
  }
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('AccountService constructed');
    
    // Check if we have a user in localStorage on initialization
    this.loadCurrentUser();
  }

  login(loginDto: LoginDTO): Observable<void> {
    const payload = { loginDto };
    console.log('Sending login request with payload:', payload);
    
    return this.http.post<LoginResponseDTO>(`${this.baseUrl}/api/auth/login`, payload).pipe(
      map((response: LoginResponseDTO) => {
        console.log('Login successful, response:', response);
        const user = this.setUserData(response);
        this.startRefreshTokenTimer();
        this._currentUser.set(user); 
        // Start the presence and notifications hub connections after login
        console.log('Starting connections after login');
      })
    );
  }

  register(registerDto: RegisterDTO): Observable<void> {
    const payload = { registerDto };
    return this.http.post<void>(`${this.baseUrl}/api/auth/register`, payload);
  }

  logout() {
    // Clear user data
    localStorage.removeItem('user');
    this._currentUser.set(null);
    this.stopRefreshTokenTimer();
    // Navigate directly to login page instead of home
    this.router.navigateByUrl('/login');
  }

  refreshToken(): Observable<void> {
    this._isRefreshingToken.set(true);

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }
  
    const payload = { refreshToken };
    return this.http.post<TokenResponseDTO>(`${this.baseUrl}/api/auth/refresh-token`, payload).pipe(
      map((response: TokenResponseDTO) => {
        console.log('Token refreshed successfully');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = this.setUserData({
          ...user,
          ...response
        });
        this._currentUser.set(updatedUser); // Make sure to update the current user
        this.startRefreshTokenTimer();
        this._isRefreshingToken.set(false);
      }),
      catchError(error => {
        this._isRefreshingToken.set(false);
        console.error('Failed to refresh token:', error);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  getToken(): string | null {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.accessToken || null;
  }

  private getRefreshToken(): string | null {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.refreshToken || null;
  }

  private setUserData(response: LoginResponseDTO | any): any {
    const user = {
      userId: response.userId,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenExpiration: new Date(response.expiration)
    };
    console.log('Setting user data:', user);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  private loadCurrentUser() {
    const userString = localStorage.getItem('user');
    if (!userString) {
      console.log('No user found in localStorage');
      return;
    }
    
    console.log('Loading user from localStorage');
    const user = JSON.parse(userString);
    if (user) {
      this._currentUser.set(user);
      this.startRefreshTokenTimer();
      
    }
  }

  private startRefreshTokenTimer() {
    // Parse token to get expiration
    const userString = localStorage.getItem('user');
    if (!userString) return;
    
    const user = JSON.parse(userString);
    const expirationDate = new Date(user.tokenExpiration);
    
    // Set timeout to 1 minute before token expires
    const timeout = expirationDate.getTime() - Date.now() - (60 * 1000);
    console.log(`Token refresh scheduled in ${Math.round(timeout/1000)} seconds`);
    
    this.refreshTokenTimeout = setTimeout(() => {
      console.log('Refreshing token...');
      this.refreshToken().subscribe();
    }, Math.max(1, timeout)); // Ensure timeout is at least 1ms
  }

  private stopRefreshTokenTimer() {
    clearTimeout(this.refreshTokenTimeout);
  }

  existsUserByUsername(username: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/api/auth/user-exists-by-username`, {
        params: { username }
      }).pipe(
        catchError(handleError)
    );
}

  existsUserByEmail(email: string): Observable<boolean> {
      return this.http.get<boolean>(`${this.baseUrl}/api/auth/user-exists-by-email`, {
        params: { email }
      }).pipe(
        catchError(handleError)
    );
  }
}