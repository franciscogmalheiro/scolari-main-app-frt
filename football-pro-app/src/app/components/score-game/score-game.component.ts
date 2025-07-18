import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TeamEditModalComponent, TeamEditData } from '../team-edit-modal/team-edit-modal.component';

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
  gameId = '';
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

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.updateDateDisplay();
    this.checkGameMode();
  }

  private checkGameMode(): void {
    this.route.queryParams.subscribe(params => {
      this.isRecordingMode = params['mode'] === 'record';
      console.log('Game mode:', this.isRecordingMode ? 'Recording' : 'Score only');
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

    // Only show QR modal and generate game ID if in recording mode
    if (this.isRecordingMode) {
      // Generate game ID (this will be provided by backend)
      this.gameId = this.generateGameId();
      
      // Show QR modal
      this.showQrModal = true;
    }

    // Download events as JSON (commented out as requested)
    // this.downloadEvents();
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
    // Commented out as requested - no longer saving events as JSON file
    /*
    const jsonStr = JSON.stringify(this.events, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `match_events_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    alert('Match events saved as JSON file!');
    */
  }

  updateDateDisplay(): void {
    // This will be handled in the template
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  // Generate a temporary game ID (will be replaced by backend)
  private generateGameId(): string {
    return 'GAME-' + Date.now().toString().slice(-6);
  }

  // Close QR modal
  onCloseQrModal(): void {
    this.showQrModal = false;
  }
}
