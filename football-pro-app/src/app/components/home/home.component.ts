import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User, Sport } from '../../services/auth.service';
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
      title: 'MARCADOR DE JOGO',
      description: 'Controla o tempo, o marcador e regista os melhores momentos',
      icon: '🏆',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      buttonText: 'INICIAR MARCADOR',
      requiresAuth: false,
      disabled: false
    },
    {
      id: 'record-game',
      title: 'GRAVA O JOGO',
      description: 'Grava todo o jogo e permite que acedas ao vídeo em diferentes formatos',
      icon: '📹',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      buttonText: 'MARCADOR E GRAVAÇÃO',
      requiresAuth: true,
      disabled: false
    },
    {
      id: 'download-video',
      title: 'DOWNLOAD DO VÍDEO',
      description: 'Acede à gravação do jogo. Podes fazer download do jogo inteiro, dos melhores momentos, ou apenas dos momentos à tua escolha.',
      icon: '⬇️',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      buttonText: 'ACESSO AOS VÍDEOS',
      requiresAuth: true,
      disabled: false
    }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    console.log('Home component initialized');
    this.authService.currentUser.subscribe(user => {
      console.log('Auth state changed:', user);
      this.currentUser = user;
      this.isAuthenticated = !!user;
      
      // Update disabled state based on user role
      this.updateGameModesDisabledState();
    });
  }

  private updateGameModesDisabledState(): void {
    this.gameModes = this.gameModes.map(mode => {
      if (mode.id === 'record-game') {
        // Disable record-game for users with role "USER"
        mode.disabled = this.currentUser?.role === 'USER';
      }
      return mode;
    });
  }

  onGameCardClick(gameMode: GameMode): void {
    // Don't allow clicking if disabled
    if (gameMode.disabled) {
      console.log('This feature is disabled for your user role');
      return;
    }

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
    this.handleGameStart('score');
  }

  private startRecordGame(): void {
    console.log('Starting Record Game...');
    this.handleGameStart('record');
  }

  private handleGameStart(mode: string): void {
    console.log('Handling game start for mode:', mode);
    console.log('Current user:', this.currentUser);
    
    // Check if user is FIELD role and has fieldId
    if (this.currentUser?.role === 'FIELD' && this.currentUser?.fieldId) {
      console.log('User is FIELD role with fieldId:', this.currentUser.fieldId);
      
      // Get sports from AuthService (loaded during login)
      const fieldSports = this.authService.getFieldSports();
      console.log('Field sports from AuthService:', fieldSports);
      
      if (fieldSports.length === 1) {
        console.log('Only one sport available, skipping game setup');
        // Only one sport available, skip game setup and go directly to game
        this.navigateToGame(mode, fieldSports[0]);
      } else {
        console.log('Multiple sports available or no sports, going to game setup');
        // Multiple sports available or no sports, go to game setup
        this.router.navigate(['/game-setup'], { queryParams: { mode } });
      }
    } else {
      console.log('User is not FIELD role or has no fieldId, going to game setup');
      // Not a FIELD user or no fieldId, go to game setup
      this.router.navigate(['/game-setup'], { queryParams: { mode } });
    }
  }

  private navigateToGame(mode: string, sport: Sport): void {
    console.log('Navigating to game with sport:', sport);
    
    if (mode === 'score') {
      // For score mode, navigate to score game
      const queryParams = {
        sportId: sport.id,
        sportName: sport.name,
        mode: mode
      };
      console.log('Navigating to score-game with params:', queryParams);
      this.router.navigate(['/score-game'], { queryParams });
    } else {
      // For record mode, navigate to record instructions
      const queryParams = {
        fieldId: this.currentUser?.fieldId,
        sportId: sport.id,
        sportCode: sport.code,
        sportName: sport.name,
        mode: mode
      };
      console.log('Navigating to record-instructions with params:', queryParams);
      this.router.navigate(['/record-instructions'], { queryParams });
    }
  }

  private openVideoLibrary(): void {
    console.log('Opening Video Library...');
    this.router.navigate(['/download-video']);
  }
}
