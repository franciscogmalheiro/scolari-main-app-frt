import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { GameMode } from '../game-card/game-card.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  isAuthenticated = false;

  gameModes: GameMode[] = [
    {
      id: 'score-game',
      title: 'SCORE GAME',
      description: 'Track live scores, manage team statistics, and experience real-time football action with our advanced scoring system.',
      icon: '🏆',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      buttonText: 'START GAME',
      requiresAuth: false
    },
    {
      id: 'record-game',
      title: 'RECORD GAME',
      description: 'Capture epic moments, record gameplay highlights, and create professional-quality football content with ease.',
      icon: '📹',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      buttonText: 'START RECORDING',
      requiresAuth: true
    },
    {
      id: 'download-video',
      title: 'DOWNLOAD VIDEO',
      description: 'Access your recorded matches, download in multiple formats, and share your best football moments instantly.',
      icon: '⬇️',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      buttonText: 'VIEW LIBRARY',
      requiresAuth: true
    }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    console.log('Home component initialized');
    this.authService.currentUser.subscribe(user => {
      console.log('Auth state changed:', user);
      this.currentUser = user;
      this.isAuthenticated = !!user;
    });
  }

  onGameCardClick(gameMode: GameMode): void {
    if (gameMode.requiresAuth && !this.isAuthenticated) {
      // Show login prompt or redirect to login
      console.log('Login required for this feature');
      return;
    }

    // Handle different game modes
    switch (gameMode.id) {
      case 'score-game':
        this.startScoreGame();
        break;
      case 'record-game':
        this.startRecordGame();
        break;
      case 'download-video':
        this.openVideoLibrary();
        break;
    }
  }

  private startScoreGame(): void {
    console.log('Starting Score Game...');
    this.router.navigate(['/score-game'], { queryParams: { mode: 'score' } });
  }

  private startRecordGame(): void {
    console.log('Starting Record Game...');
    this.router.navigate(['/record-instructions']);
  }

  private openVideoLibrary(): void {
    console.log('Opening Video Library...');
    this.router.navigate(['/download-video']);
  }
}
