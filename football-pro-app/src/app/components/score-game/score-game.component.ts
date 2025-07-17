import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TeamEditModalComponent, TeamEditData } from '../team-edit-modal/team-edit-modal.component';

interface MatchEvent {
  dateTime: string;
  eventName: 'start' | 'finish' | 'goal' | 'highlight';
  team?: 'A' | 'B' | null;
  result: string;
  elapsedTime?: string;
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
  
  // Team properties
  teamAName = 'COLETES';
  teamBName = 'OUTROS';
  teamAScore = 0;
  teamBScore = 0;
  teamAColor = '#ff6b35';
  teamBColor = '#007bff';
  
  // Event tracking
  events: MatchEvent[] = [];
  teamAEvents: string[] = [];
  teamBEvents: string[] = [];
  highlightEvents: string[] = [];
  
  // UI state
  showControls = false;
  showFinalResult = false;
  currentDate = new Date();
  
  // Modal state
  showEditModal = false;
  editingTeam: 'A' | 'B' | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateDateDisplay();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // Timer functions
  startMatch(): void {
    if (this.events.length > 0) {
      if (!confirm("Starting a new match will clear the current events. Proceed?")) {
        return;
      }
      this.clearEvents();
    }

    this.isMatchStarted = true;
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
    }, 1000);
  }

  finishMatch(): void {
    if (!confirm("Are you sure you want to finish the match?")) {
      return;
    }

    clearInterval(this.timerInterval);
    this.isMatchStarted = false;
    this.isMatchFinished = true;
    this.showControls = false;
    this.showFinalResult = true;

    this.events.push({
      dateTime: new Date().toISOString(),
      eventName: 'finish',
      team: null,
      result: this.getCurrentResult()
    });

    // Download events as JSON
    this.downloadEvents();
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
    } else if (team === 'B' && this.teamBScore > 0) {
      this.teamBScore--;
    }

    const elapsedTime = this.formatTime(this.secondsElapsed);
    this.addEventToLog(team, elapsedTime + ' (UNDO)');
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
      this.teamAEvents.unshift(`⚽ ${elapsedTime} (${result})`);
    } else if (team === 'B') {
      this.teamBEvents.unshift(`⚽ ${elapsedTime} (${result})`);
    } else {
      this.highlightEvents.unshift(`⭐ ${elapsedTime}`);
    }
  }

  clearEvents(): void {
    this.events = [];
    this.teamAEvents = [];
    this.teamBEvents = [];
    this.highlightEvents = [];
  }

  downloadEvents(): void {
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
  }

  updateDateDisplay(): void {
    // This will be handled in the template
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
