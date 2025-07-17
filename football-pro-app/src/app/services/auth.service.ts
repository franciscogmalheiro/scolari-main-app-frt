import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id: string;
  email: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private readonly TOKEN_KEY = 'football_pro_token';
  private readonly USER_KEY = 'football_pro_user';

  constructor(private router: Router) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.getToken();
  }

  login(email: string, password: string): Promise<boolean> {
    // Simulate API call - in real app, this would be an HTTP request
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email && password) {
          // Mock user data - in real app, this would come from the server
          const user: User = {
            id: '1',
            email: email,
            name: email.split('@')[0]
          };
          
          // Mock JWT token
          const token = this.generateMockToken(user);
          
          this.setToken(token);
          this.setUser(user);
          this.currentUserSubject.next(user);
          
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000); // Simulate network delay
    });
  }

  register(email: string, password: string, name: string): Promise<boolean> {
    // Simulate API call for registration
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email && password && name) {
          const user: User = {
            id: Date.now().toString(),
            email: email,
            name: name
          };
          
          const token = this.generateMockToken(user);
          
          this.setToken(token);
          this.setUser(user);
          this.currentUserSubject.next(user);
          
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    });
  }

  logout(): void {
    this.removeToken();
    this.removeUser();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private generateMockToken(user: User): string {
    // In a real app, this would be a proper JWT token from the server
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    // Simple base64 encoding for demo purposes
    return btoa(JSON.stringify(payload));
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getToken(): string | null {
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
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }
}
