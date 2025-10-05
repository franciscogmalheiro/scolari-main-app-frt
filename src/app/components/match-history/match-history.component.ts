import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { MatchService, FieldMatchResponseDto } from '../../services/match.service';

@Component({
  selector: 'app-match-history',
  templateUrl: './match-history.component.html',
  styleUrls: ['./match-history.component.scss']
})
export class MatchHistoryComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  currentUser: User | null = null;
  matches: FieldMatchResponseDto[] = [];

  constructor(
    private authService: AuthService,
    private matchService: MatchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadMatches(user);
      } else {
        this.errorMessage = 'User not available.';
      }
    });
  }

  loadMatches(user: User): void {
    this.isLoading = true;
    
    let matchObservable;
    
    if (user.role === 'USER') {
      // For users with role "USER", call the user endpoint
      matchObservable = this.matchService.getMatchesByUser(user.id);
    } else {
      // For other roles (FIELD, ADMIN), call the field endpoint
      if (user.fieldId) {
        matchObservable = this.matchService.getMatchesByField(user.fieldId);
      } else {
        this.errorMessage = 'Field ID not available for current user.';
        this.isLoading = false;
        return;
      }
    }
    
    matchObservable.subscribe({
      next: (data) => {
        this.matches = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load match history.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  goToDownload(match: FieldMatchResponseDto): void {
    if (match.recordingCode) {
      // If recording code is available, use the recording code route
      this.router.navigate(['/media-library/recording-code', match.recordingCode]);
    } else {
      // If recording code is null, use the video-library route with matchCode
      this.router.navigate(['/video-library', match.matchCode]);
    }
  }
}
