import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GameSetupService, Field, Sport } from '../../services/game-setup.service';

@Component({
  selector: 'app-game-setup',
  templateUrl: './game-setup.component.html',
  styleUrls: ['./game-setup.component.scss']
})
export class GameSetupComponent implements OnInit {
  fields: Field[] = [];
  sports: Sport[] = [];
  selectedField: Field | null = null;
  selectedSport: Sport | null = null;
  loadingFields = false;
  loadingSports = false;
  gameMode: string = '';

  constructor(
    private gameSetupService: GameSetupService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.gameMode = params['mode'] || '';
    });
    this.loadFields();
  }

  loadFields(): void {
    this.loadingFields = true;
    this.gameSetupService.getFields().subscribe({
      next: (fields: Field[]) => {
        this.fields = fields;
        this.loadingFields = false;
      },
      error: (error: any) => {
        console.error('Error loading fields:', error);
        this.loadingFields = false;
      }
    });
  }

  onFieldSelect(field: Field): void {
    this.selectedField = field;
    this.selectedSport = null;
    this.loadSports(field.id);
  }

  loadSports(fieldId: number): void {
    this.loadingSports = true;
    this.gameSetupService.getSportsByField(fieldId).subscribe({
      next: (sports: Sport[]) => {
        this.sports = sports;
        this.loadingSports = false;
      },
      error: (error: any) => {
        console.error('Error loading sports:', error);
        this.loadingSports = false;
      }
    });
  }

  onSportSelect(sport: Sport): void {
    this.selectedSport = sport;
  }

  continueToGame(): void {
    if (this.selectedField && this.selectedSport) {
      const queryParams = {
        fieldId: this.selectedField.id,
        fieldName: this.selectedField.name,
        sportId: this.selectedSport.id,
        sportCode: this.selectedSport.code,
        sportName: this.selectedSport.name,
        mode: this.gameMode
      };

      if (this.gameMode === 'score') {
        this.router.navigate(['/score-game'], { queryParams });
      } else if (this.gameMode === 'record') {
        this.router.navigate(['/record-instructions'], { queryParams });
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
} 