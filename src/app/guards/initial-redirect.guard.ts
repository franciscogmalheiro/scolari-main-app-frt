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
    if (this.authService.isAuthenticated && this.authService.isTokenValid()) {
      // User is authenticated, redirect to home
      this.router.navigate(['/home']);
      return false;
    } else {
      // User is not authenticated, redirect to login
      this.router.navigate(['/login']);
      return false;
    }
  }
}
