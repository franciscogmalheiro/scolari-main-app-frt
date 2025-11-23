import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Sport {
  id: number;
  code: string;
  name: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  fieldId?: number;
  fieldSports?: Sport[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  fieldId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private readonly TOKEN_KEY = 'football_pro_token';
  private readonly USER_KEY = 'football_pro_user';
  private readonly API_BASE_URL = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.getToken() && this.isTokenValid();
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const loginRequest: LoginRequest = { username, password };
      
      const response = await this.http.post<AuthResponse>(
        `${this.API_BASE_URL}/auth/signin`,
        loginRequest
      ).toPromise();

      if (response) {
        const user: User = {
          id: response.id,
          username: response.username,
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          role: response.role,
          fieldId: response.fieldId
        };

        // Load sports data for FIELD users
        if (user.role === 'FIELD' && user.fieldId) {
          try {
            const sports = await this.loadFieldSports(user.fieldId);
            user.fieldSports = sports;
            console.log('Field sports loaded during login:', sports);
          } catch (error) {
            console.error('Error loading field sports during login:', error);
            user.fieldSports = [];
          }
        }

        this.setToken(response.token);
        this.setUser(user);
        this.currentUserSubject.next(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(username: string, email: string, password: string, firstName?: string, lastName?: string): Promise<boolean> {
    try {
      const registerRequest: RegisterRequest = {
        username,
        email,
        password,
        ...(firstName && { firstName }),
        ...(lastName && { lastName })
      };

      const response = await this.http.post(
        `${this.API_BASE_URL}/auth/signup`,
        registerRequest,
        { responseType: 'text' }
      ).toPromise();

      // If we get here, registration was successful (200 response)
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  logout(): void {
    this.removeToken();
    this.removeUser();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Get HTTP headers with authorization token
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  private removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  // Check if token is valid (in real app, this would verify the JWT signature)
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) {
      console.log('isTokenValid: No token found');
      return false;
    }
    
    try {
      // For JWT tokens, we can decode the payload to check expiration
      const payload = this.decodeJwtPayload(token);
      if (!payload) {
        console.log('isTokenValid: Failed to decode token payload');
        return false;
      }
      
      console.log('isTokenValid: Token payload:', payload);
      
      // If token doesn't have expiration, consider it valid (some tokens don't expire)
      if (!payload.exp) {
        console.log('isTokenValid: Token has no expiration field, considering valid');
        return true;
      }
      
      const now = Math.floor(Date.now() / 1000);
      const isValid = payload.exp > now;
      console.log('isTokenValid: Token exp:', payload.exp, 'Current time:', now, 'Valid:', isValid);
      
      if (!isValid) {
        console.log('isTokenValid: Token expired. Expiration was:', new Date(payload.exp * 1000));
      }
      
      return isValid;
    } catch (error) {
      console.error('isTokenValid: Error validating token:', error);
      return false;
    }
  }

  private decodeJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private async loadFieldSports(fieldId: number): Promise<Sport[]> {
    try {
      const response = await this.http.get<Sport[]>(
        `${this.API_BASE_URL}/field-sports/field/${fieldId}/sports`
      ).toPromise();
      return response || [];
    } catch (error) {
      console.error('Error loading field sports:', error);
      return [];
    }
  }

  // Get field sports for current user
  public getFieldSports(): Sport[] {
    const user = this.currentUserValue;
    return user?.fieldSports || [];
  }

  // Refresh field sports (useful for manual refresh)
  public async refreshFieldSports(): Promise<void> {
    const user = this.currentUserValue;
    if (user?.role === 'FIELD' && user?.fieldId) {
      try {
        const sports = await this.loadFieldSports(user.fieldId);
        user.fieldSports = sports;
        this.setUser(user);
        this.currentUserSubject.next(user);
        console.log('Field sports refreshed:', sports);
      } catch (error) {
        console.error('Error refreshing field sports:', error);
      }
    }
  }
}
