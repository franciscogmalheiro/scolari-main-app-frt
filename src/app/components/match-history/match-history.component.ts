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
      if (user?.fieldId) {
        this.loadMatches(user.fieldId);
      } else {
        this.errorMessage = 'Field ID not available for current user.';
      }
    });
  }

  loadMatches(fieldId: number): void {
    this.isLoading = true;
    this.matchService.getMatchesByField(fieldId).subscribe({
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

  goToDownload(matchCode: string): void {
    this.router.navigate(['/download-video', matchCode]);
  }
}
