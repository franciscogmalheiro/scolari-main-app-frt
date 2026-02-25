import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User, Sport } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { RecordingCodeService } from '../../services/recording-code.service';
import { TutorialSlide } from '../tutorial-carousel-modal/tutorial-carousel-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  isAuthenticated = false;
  appVersion: string = environment.appVersion;
  recordingCode = '';
  isSearching = false;
  searchErrorMessage = '';
  isTutorialModalOpen = false;
  tutorialSlides: TutorialSlide[] = [
    {
      imageUrl: 'assets/tutorial/slide1.png',
      text: 'Bem-vindo ao Scolari! Aqui podes gravar e rever os melhores momentos dos teus jogos.'
    },
    {
      imageUrl: 'assets/tutorial/slide2.png',
      text: 'Usa o botão GRAVA para iniciar uma nova gravação do teu jogo.'
    },
    {
      imageUrl: 'assets/tutorial/slide3.png',
      text: 'Usa o botão REVÊ para aceder aos vídeos usando o teu código de gravação.'
    },
    {
      imageUrl: 'assets/tutorial/slide4.png',
      text: 'Acede aos teus FAVORITOS para ver o histórico de jogos, golos e highlights.'
    }
  ];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private recordingCodeService: RecordingCodeService
  ) {}

  ngOnInit(): void {
    console.log('Home component initialized');
    this.authService.currentUser.subscribe(user => {
      console.log('Auth state changed:', user);
      this.currentUser = user;
      this.isAuthenticated = !!user;
    });
  }

  onRecordGameClick(): void {
    console.log('Starting Record Game...');
    this.startRecordGame();
  }

  onFavoritesClick(): void {
    if (!this.isAuthenticated) {
      console.log('Login required for this feature');
      return;
    }
    this.openMatchHistory();
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
    
    // Navigate to record instructions for the unified record mode
    const queryParams = {
      fieldId: this.currentUser?.fieldId,
      sportId: sport.id,
      mode: mode
    };
    console.log('Navigating to record-instructions with params:', queryParams);
    this.router.navigate(['/record-instructions'], { queryParams });
  }

  onSearchRecordingCode(code: string): void {
    if (!code || code.length < 3) {
      return;
    }

    this.isSearching = true;
    this.searchErrorMessage = '';

    this.recordingCodeService.validateRecordingCode(code).subscribe({
      next: (response) => {
        // Check if response includes vipCodeId
        if (response.vipCodeId) {
          // Navigate to match history with vipCode query param
          this.router.navigate(['/match-history'], { queryParams: { vipCode: response.vipCode || code } });
        } else {
          // Code is valid, navigate directly to media library
          this.router.navigate(['/media-library/recording-code', code]);
        }
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Error validating recording code:', error);
        this.searchErrorMessage = 'Código de gravação inválido';
        this.isSearching = false;
      }
    });
  }

  private openMatchHistory(): void {
    console.log('Opening Match History...');
    this.router.navigate(['/match-history']);
  }

  onSearchSubmit(): void {
    if (this.recordingCode && this.recordingCode.length >= 3 && !this.isSearching) {
      this.onSearchRecordingCode(this.recordingCode);
    }
  }

  onRecordingCodeChange(value: string): void {
    this.recordingCode = value;
  }

  openTutorial(): void {
    this.isTutorialModalOpen = true;
  }

  closeTutorial(): void {
    this.isTutorialModalOpen = false;
  }
}
