import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TeamEditModalComponent, TeamEditData } from '../team-edit-modal/team-edit-modal.component';
import { MatchService, MatchDto } from '../../services/match.service';

interface MatchEvent {
  dateTime: string;
  eventName: 'start' | 'finish' | 'goal' | 'highlight';
  team?: 'A' | 'B' | null;
  result: string;
  elapsedTime?: string;
}

interface EventItem {
  text: string;
  isUndone: boolean;
}

@Component({
  selector: 'app-score-game',
  templateUrl: './score-game.component.html',
  styleUrls: ['./score-game.component.scss']
})
export class ScoreGameComponent implements OnInit, OnDestroy {
  // Timer properties
  timerInterval: any;
  secondsElapsed = 0;
  isMatchStarted = false;
  isMatchFinished = false;
  
  // Recording properties
  isRecording = false;
  showQrModal = false;
  showConfirmModal = false;
  showStartConfirmModal = false;
  gameId = ''; // This will contain the match code from the backend
  qrCodeData = '';
  isRecordingMode = false;
  
  // Team properties
  teamAName = 'COLETES';
  teamBName = 'OUTROS';
  teamAScore = 0;
  teamBScore = 0;
  teamAColor = '#ff6b35';
  teamBColor = '#007bff';
  
  // Event tracking
  events: MatchEvent[] = [];
  teamAEvents: EventItem[] = [];
  teamBEvents: EventItem[] = [];
  highlightEvents: EventItem[] = [];
  
  // UI state
  showControls = false;
  showFinalResult = false;
  currentDate = new Date();
  
  // Modal state
  showEditModal = false;
  editingTeam: 'A' | 'B' | null = null;

  // Match data from query parameters
  fieldId: number | null = null;
  sportId: number | null = null;
  fieldName: string = '';
  sportName: string = '';

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    this.updateDateDisplay();
    this.checkGameMode();
  }

  private checkGameMode(): void {
    // Use snapshot to get parameters immediately
    const params = this.route.snapshot.queryParams;
    console.log('Received query params (snapshot):', params);
    
    this.isRecordingMode = params['mode'] === 'record';
    this.fieldId = params['fieldId'] ? Number(params['fieldId']) : null;
    this.sportId = params['sportId'] ? Number(params['sportId']) : null;
    this.fieldName = params['fieldName'] || '';
    this.sportName = params['sportName'] || '';
    
    console.log('Game mode:', this.isRecordingMode ? 'Recording' : 'Score only');
    console.log('Field ID:', this.fieldId, 'Sport ID:', this.sportId);
    console.log('Field Name:', this.fieldName, 'Sport Name:', this.sportName);
    
    // Also subscribe for any changes
    this.route.queryParams.subscribe(params => {
      console.log('Received query params (subscription):', params);
      this.isRecordingMode = params['mode'] === 'record';
      this.fieldId = params['fieldId'] ? Number(params['fieldId']) : null;
      this.sportId = params['sportId'] ? Number(params['sportId']) : null;
      this.fieldName = params['fieldName'] || '';
      this.sportName = params['sportName'] || '';
      console.log('Updated - Field ID:', this.fieldId, 'Sport ID:', this.sportId);
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // Timer functions
  startMatch(): void {
    if (this.events.length > 0) {
      this.showStartConfirmModal = true;
      return;
    }
    this.doStartMatch();
  }

  onConfirmStartMatch(): void {
    this.showStartConfirmModal = false;
    this.clearEvents();
    this.doStartMatch();
  }

  onCancelStartMatch(): void {
    this.showStartConfirmModal = false;
  }

  private doStartMatch(): void {
    console.log('doStartMatch called with fieldId:', this.fieldId, 'sportId:', this.sportId);
    // Call backend to create match
    if (this.fieldId && this.sportId) {
      const matchData: MatchDto = {
        fieldId: this.fieldId,
        teamAName: this.teamAName,
        teamBName: this.teamBName,
        sportId: this.sportId
      };

      this.matchService.createMatch(matchData).subscribe({
        next: (response) => {
          console.log('Match created successfully:', response);
          this.gameId = response.matchCode;
          this.startMatchTimer();
        },
        error: (error) => {
          console.error('Error creating match:', error);
          // Cannot start match without backend game ID
          console.error('Cannot start match: Backend game ID is required');
          return;
        }
      });
    } else {
      // Cannot start match without field/sport data (required for backend)
      console.error('Cannot start match: Field and sport data are required');
      return;
    }
  }

  private startMatchTimer(): void {
    this.isMatchStarted = true;
    this.isRecording = this.isRecordingMode; // Only start recording if in recording mode
    this.showControls = true;
    this.showFinalResult = false;
    this.teamAScore = 0;
    this.teamBScore = 0;

    this.events.push({
      dateTime: new Date().toISOString(),
      eventName: 'start',
      team: null,
      result: this.getCurrentResult()
    });

    const startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const currentTime = Date.now();
      this.secondsElapsed = Math.floor((currentTime - startTime) / 1000);
      
      // Auto-stop recording after 90 minutes (5400 seconds) - only in recording mode
      if (this.isRecordingMode && this.secondsElapsed >= 5400) {
        this.finishMatch();
      }
    }, 1000);
  }

  finishMatch(): void {
    this.showConfirmModal = true;
  }

  onConfirmFinishMatch(): void {
    this.showConfirmModal = false;
    
    clearInterval(this.timerInterval);
    this.isMatchStarted = false;
    this.isRecording = false; // Stop recording
    this.isMatchFinished = true;
    this.showControls = false;
    this.showFinalResult = true;

    this.events.push({
      dateTime: new Date().toISOString(),
      eventName: 'finish',
      team: null,
      result: this.getCurrentResult()
    });

    // Upload events to backend
    this.downloadEvents();

    // Only show QR modal if in recording mode
    if (this.isRecordingMode) {
      // Show QR modal with the match code from the backend
      this.showQrModal = true;
    }
  }

  onCancelFinishMatch(): void {
    this.showConfirmModal = false;
  }

  // Goal functions
  addTeamGoal(team: 'A' | 'B'): void {
    if (team === 'A') {
      this.teamAScore++;
    } else {
      this.teamBScore++;
    }

    const elapsedTime = this.formatTime(this.secondsElapsed);
    this.events.push({
      dateTime: new Date().toISOString(),
      eventName: 'goal',
      team: team,
      result: this.getCurrentResult(),
      elapsedTime: elapsedTime
    });

    this.addEventToLog(team, elapsedTime);
  }

  decreaseTeamGoal(team: 'A' | 'B'): void {
    if (team === 'A' && this.teamAScore > 0) {
      this.teamAScore--;
      // Mark the most recent team A event as undone
      if (this.teamAEvents.length > 0) {
        this.teamAEvents[this.teamAEvents.length - 1].isUndone = true;
      }
    } else if (team === 'B' && this.teamBScore > 0) {
      this.teamBScore--;
      // Mark the most recent team B event as undone
      if (this.teamBEvents.length > 0) {
        this.teamBEvents[this.teamBEvents.length - 1].isUndone = true;
      }
    }
  }

  addHighlight(): void {
    const elapsedTime = this.formatTime(this.secondsElapsed);
    this.events.push({
      dateTime: new Date().toISOString(),
      eventName: 'highlight',
      team: null,
      result: this.getCurrentResult(),
      elapsedTime: elapsedTime
    });

    this.addEventToLog(null, elapsedTime);
  }

  // Team editing
  editTeam(team: 'A' | 'B'): void {
    this.editingTeam = team;
    this.showEditModal = true;
  }

  onTeamEditSave(teamData: TeamEditData): void {
    if (teamData.team === 'A') {
      this.teamAName = teamData.name;
      this.teamAColor = teamData.color;
    } else {
      this.teamBName = teamData.name;
      this.teamBColor = teamData.color;
    }
    this.showEditModal = false;
    this.editingTeam = null;
  }

  onTeamEditCancel(): void {
    this.showEditModal = false;
    this.editingTeam = null;
  }

  get teamEditData(): TeamEditData | null {
    if (!this.editingTeam) return null;
    
    return {
      team: this.editingTeam,
      name: this.editingTeam === 'A' ? this.teamAName : this.teamBName,
      color: this.editingTeam === 'A' ? this.teamAColor : this.teamBColor
    };
  }

  // Utility functions
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getCurrentResult(): string {
    return `${this.teamAScore}-${this.teamBScore}`;
  }

  addEventToLog(team: 'A' | 'B' | null, elapsedTime: string): void {
    const result = this.getCurrentResult();
    
    if (team === 'A') {
      this.teamAEvents.push({ text: `${elapsedTime} ⚽`, isUndone: false });
    } else if (team === 'B') {
      this.teamBEvents.push({ text: `⚽ ${elapsedTime}`, isUndone: false });
    } else {
      this.highlightEvents.push({ text: `⭐ ${elapsedTime}`, isUndone: false });
    }
  }

  clearEvents(): void {
    this.events = [];
    this.teamAEvents = [];
    this.teamBEvents = [];
    this.highlightEvents = [];
  }

  downloadEvents(): void {
    if (!this.gameId) {
      console.error('No game ID available for uploading events');
      return;
    }

    // Send events to backend
    this.matchService.uploadEvents(this.gameId, this.events).subscribe({
      next: (response) => {
        console.log('Events uploaded successfully:', response);
      },
      error: (error) => {
        console.error('Error uploading events:', error);
      }
    });
  }

  updateDateDisplay(): void {
    // This will be handled in the template
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }



  // Close QR modal
  onCloseQrModal(): void {
    this.showQrModal = false;
  }
}
