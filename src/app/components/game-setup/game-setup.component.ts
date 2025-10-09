import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GameSetupService, Sport as GameSetupSport } from '../../services/game-setup.service';
import { SportService, Sport } from '../../services/sport.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-game-setup',
  templateUrl: './game-setup.component.html',
  styleUrls: ['./game-setup.component.scss']
})
export class GameSetupComponent implements OnInit {
  sports: (Sport | GameSetupSport)[] = [];
  selectedSport: Sport | GameSetupSport | null = null;
  loadingSports = false;
  gameMode: string = '';
  currentUser: User | null = null;

  constructor(
    private gameSetupService: GameSetupService,
    private sportService: SportService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    
    this.route.queryParams.subscribe(params => {
      this.gameMode = params['mode'] || '';
      
      // Load sports based on user's fieldId
      this.loadSports();
    });
  }

  loadSports(): void {
    this.loadingSports = true;
    
    if (this.currentUser?.fieldId) {
      // If user has a fieldId, get sports for that specific field
      this.sportService.getSportsByField(this.currentUser.fieldId).subscribe({
        next: (sports: Sport[]) => {
          this.sports = sports;
          this.loadingSports = false;
          
          // Auto-select and redirect if only one sport is available
          if (sports.length === 1) {
            this.autoSelectAndRedirect(sports[0]);
          }
        },
        error: (error: any) => {
          console.error('Error loading sports for field:', error);
          this.loadingSports = false;
        }
      });
    } else {
      // If no fieldId, get all sports
      this.sportService.getAllSports().subscribe({
        next: (sports: Sport[]) => {
          this.sports = sports;
          this.loadingSports = false;
          
          // Auto-select and redirect if only one sport is available
          if (sports.length === 1) {
            this.autoSelectAndRedirect(sports[0]);
          }
        },
        error: (error: any) => {
          console.error('Error loading all sports:', error);
          this.loadingSports = false;
        }
      });
    }
  }

  private autoSelectAndRedirect(sport: Sport | GameSetupSport): void {
    console.log('Auto-selecting sport and redirecting:', sport);
    this.selectedSport = sport;
    
    if (this.gameMode === 'score') {
      // For score mode, navigate to score game
      const queryParams = {
        sportId: sport.id,
        sportName: sport.name,
        mode: this.gameMode
      };
      this.router.navigate(['/score-game'], { queryParams });
    } else {
      // For record mode, navigate to record instructions
      const gameSetupSport = sport as GameSetupSport;
      const queryParams = {
        fieldId: this.currentUser?.fieldId,
        sportId: sport.id,
        sportCode: gameSetupSport.code,
        sportName: sport.name,
        mode: this.gameMode
      };
      this.router.navigate(['/record-instructions'], { queryParams });
    }
  }

  onSportSelect(sport: Sport | GameSetupSport): void {
    this.selectedSport = sport;
  }

  getSportIcon(sport: Sport | GameSetupSport): string {
    const gameSetupSport = sport as GameSetupSport;
    if (gameSetupSport.code === 'FUTSAL' || gameSetupSport.code === 'FOOTBALL') {
      return '⚽';
    }
    return '🏃';
  }

  getSportCode(sport: Sport | GameSetupSport): string | null {
    const gameSetupSport = sport as GameSetupSport;
    return gameSetupSport.code || null;
  }

  hasSportCode(sport: Sport | GameSetupSport): boolean {
    const gameSetupSport = sport as GameSetupSport;
    return !!gameSetupSport.code;
  }

  continueToGame(): void {
    if (this.selectedSport) {
      if (this.gameMode === 'score') {
        // For score mode, navigate to score game
        const queryParams = {
          sportId: this.selectedSport.id,
          sportName: this.selectedSport.name,
          mode: this.gameMode
        };
        this.router.navigate(['/score-game'], { queryParams });
      } else {
        // For record mode, navigate to record instructions
        const gameSetupSport = this.selectedSport as GameSetupSport;
        const queryParams = {
          fieldId: this.currentUser?.fieldId,
          sportId: this.selectedSport.id,
          sportCode: gameSetupSport.code,
          sportName: this.selectedSport.name,
          mode: this.gameMode
        };
        this.router.navigate(['/record-instructions'], { queryParams });
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
} 