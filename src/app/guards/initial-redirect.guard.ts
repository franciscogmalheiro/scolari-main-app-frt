import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class InitialRedirectGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const token = this.authService.getToken();
    const isTokenValid = this.authService.isTokenValid();
    const isAuthenticated = this.authService.isAuthenticated;
    
    console.log('InitialRedirectGuard - Token exists:', !!token);
    console.log('InitialRedirectGuard - Token valid:', isTokenValid);
    console.log('InitialRedirectGuard - Is authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      // User is authenticated, redirect to home
      console.log('InitialRedirectGuard - Redirecting to /home');
      this.router.navigate(['/home']);
      return false;
    } else {
      // User is not authenticated, redirect to login
      console.log('InitialRedirectGuard - Redirecting to /login');
      this.router.navigate(['/login']);
      return false;
    }
  }
}
