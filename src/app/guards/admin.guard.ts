import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated && this.authService.isTokenValid()) {
      // Get current user from localStorage since the subject is private
      const userStr = localStorage.getItem('football_pro_user');
      const currentUser: User | null = userStr ? JSON.parse(userStr) : null;
      
      if (currentUser && currentUser.role === 'ADMIN') {
        return true;
      } else {
        this.router.navigate(['/home']);
        return false;
      }
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }
} 