import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { DownloadFormStateService } from '../../services/download-form-state.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private downloadFormStateService: DownloadFormStateService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
    });
  }

  logout(): void {
    this.authService.logout();
  }

  navigateToHome(): void {
    // Clear any saved form state when navigating to home
    this.downloadFormStateService.clearFormState();
    this.router.navigate(['/home']);
  }
}
