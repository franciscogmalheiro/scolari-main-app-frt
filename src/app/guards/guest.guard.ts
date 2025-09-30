import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated && this.authService.isTokenValid()) {
      // User is already logged in, redirect to home
      this.router.navigate(['/home']);
      return false;
    } else {
      // User is not logged in, allow access to login page
      return true;
    }
  }
}
