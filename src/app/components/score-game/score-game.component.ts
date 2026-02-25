import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatchService, MatchDto, IndividualMatchEventDto, MatchEventRequestDto } from '../../services/match.service';
import { CameraService } from '../../services/camera.service';
import { HttpEvent, HttpEventType } from '@angular/common/http';

interface MatchEvent {
  id?: number; // Backend event ID for recording mode
  dateTime: string;
  eventName: 'start' | 'finish' | 'goal' | 'highlight';
  team?: string | null;
  result: string;
  elapsedTime?: string;
}

interface EventItem {
  text: string;
  isUndone: boolean;
}

interface SavedMatchState {
  matchStartTime: number; // Timestamp when match started
  gameId: string;
  matchId: number | null;
  teamAScore: number;
  teamBScore: number;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  events: MatchEvent[];
  isMatchStarted: boolean;
  isMatchFinished: boolean;
  isRecordingMode: boolean;
  fieldId: number | null;
  sportId: number | null;
  recordingCode: string | null;
  attackingTeamAtScolariGoal: 'A' | 'B' | null;
}

@Component({
  selector: 'app-score-game',
  templateUrl: './score-game.component.html',
  styleUrls: ['./score-game.component.scss', './event-edit-modal.scss']
})
export class ScoreGameComponent implements OnInit, OnDestroy {
  private readonly MATCH_STATE_STORAGE_KEY = 'scolari_match_state';
  
  // Timer properties
  timerInterval: any;
  secondsElapsed = 0;
  isMatchStarted = false;
  isMatchFinished = false;
  private matchStartTime: number | null = null; // Timestamp when match started
  private matchFinishTime: number | null = null; // Timestamp when match finished
  // Wake lock to prevent screen from turning off
  private wakeLock: any = null;
  // Recording properties
  isRecording = false;
  showConfirmModal = false;
  showStartConfirmModal = false;
  showStartMatchErrorModal = false;
  gameId = ''; // This will contain the match code from the backend
  matchId: number | null = null; // This will contain the match ID from the backend
  fieldCameraId: number | null = null; // Field camera ID for recording mode
  isRecordingMode = false;
  // Attacking team selection for recording mode
  showAttackingTeamModal = false;
  attackingTeamAtScolariGoal: 'A' | 'B' | null = null;
  // Error redirect params
  private errorRedirectParams: any = {};
  
  // Team properties
  teamAName = 'COLETES';
  teamBName = 'OUTROS';
  teamAScore = 0;
  teamBScore = 0;
  teamAColor = '#ff6b35';
  teamBColor = '#007bff';
  
  // Color options for team editing
  teamColorOptions = [
    '#ff6b35', // Orange
    '#007bff', // Blue
    '#28a745', // Green
    '#dc3545', // Red
    '#ffc107', // Yellow
    '#ffffff',  // White
    '#000000'  // Black
  ];
  
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
  showEditTeamsModal = false;
  
  // Photo capture state
  isCapturingPhoto = false;
  photoUploadProgress = 0;
  lastCapturedPhotoUrl: string | null = null;
  showPhotoPreviewModal = false;
  
  // Timeout modal state
  showTimeoutModal = false;

  // Edit mode state
  isEditMode = false;
  showEventEditModal = false;
  editingEventTeam: 'A' | 'B' | null = null;
  editingEventIndex: number | null = null;
  editingEventType: 'goal' | 'highlight' | null = null;
  editingEventTeamSelection: 'A' | 'B' = 'A';
  originalEventIndex: number | null = null; // Store the original index in events array

  // Match data from query parameters
  fieldId: number | null = null;
  sportId: number | null = null;
  fieldName: string = '';
  recordingCode: string | null = null;

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private matchService: MatchService,
    private cameraService: CameraService
  ) {}

  ngOnInit(): void {
    // Reset scroll position to top when component initializes
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    this.updateDateDisplay();
    this.checkGameMode();
    
    // If recordingCode is provided, load from backend (clear localStorage first to avoid conflicts)
    if (this.recordingCode) {
      this.clearMatchState(); // Clear any existing match state
      this.loadMatchFromRecordingCode();
      return; // Don't open edit teams modal if loading from backend
    }
    
    // Try to restore match state from localStorage
    const restored = this.restoreMatchState();
    
    // Prevent body scrolling when on score game page
    document.body.classList.add('no-scroll');
    
    // Listen for visibility changes to reacquire wake lock if needed
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Only open the "Editar Equipas" modal if match wasn't restored
    if (!restored) {
      this.openEditTeamsModal();
    }
  }

  private checkGameMode(): void {
    // Use snapshot to get parameters immediately
    const params = this.route.snapshot.queryParams;
    console.log('Received query params (snapshot):', params);
    
    // Check for new recordingMode parameter first, fallback to old mode parameter
    this.isRecordingMode = params['recordingMode'] === 'true';
    this.fieldId = params['fieldId'] ? Number(params['fieldId']) : null;
    this.sportId = params['sportId'] ? Number(params['sportId']) : null;
    this.fieldName = params['fieldName'] || '';
    this.recordingCode = params['recordingCode'] || null;
    
    console.log('Game mode:', this.isRecordingMode ? 'Recording' : 'Score only');
    console.log('Field ID:', this.fieldId, 'Sport ID:', this.sportId);
    console.log('Field Name:', this.fieldName);
    
    // Also subscribe for any changes
    this.route.queryParams.subscribe(params => {
      console.log('Received query params (subscription):', params);
      this.isRecordingMode = params['recordingMode'] === 'true';
      this.fieldId = params['fieldId'] ? Number(params['fieldId']) : null;
      this.sportId = params['sportId'] ? Number(params['sportId']) : null;
      this.fieldName = params['fieldName'] || '';
      this.recordingCode = params['recordingCode'] || null;
      console.log('Updated - Field ID:', this.fieldId, 'Sport ID:', this.sportId);
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    // Release wake lock when component is destroyed
    this.releaseWakeLock();
    // Remove visibility change listener
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    // Re-enable body scrolling when leaving score game page
    document.body.classList.remove('no-scroll');
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

  onCloseStartMatchErrorModal(): void {
    this.showStartMatchErrorModal = false;
    // Redirect to record-instructions page after closing modal
    this.router.navigate(['/record-instructions'], { queryParams: this.errorRedirectParams });
  }

  private doStartMatch(): void {
    console.log('doStartMatch called with fieldId:', this.fieldId, 'sportId:', this.sportId);
    
    // Clear any old match state when starting a new match
    this.clearMatchState();
    
    // In recording mode, fieldId is mandatory
    if (this.isRecordingMode && !this.fieldId) {
      console.error('Cannot start match: Field ID is required in recording mode');
      return;
    }
    
    // Call backend to create match
    if (this.sportId) {
      const matchData: MatchDto = {
        fieldId: this.fieldId || undefined,
        teamAName: this.teamAName,
        teamBName: this.teamBName,
        sportId: this.sportId,
        recordMode: this.isRecordingMode,
        recordingCode: this.recordingCode || undefined,
        teamAColor: this.teamAColor,
        teamBColor: this.teamBColor
      };

      this.matchService.createMatch(matchData).subscribe({
        next: (response) => {
          console.log('Match created successfully:', response);
          this.gameId = response.matchCode;
          this.matchId = response.id;
          this.startMatchTimer();
        },
        error: (error) => {
          console.error('Error creating match:', error);
          // Store query params for redirect after modal is closed
          this.errorRedirectParams = {};
          if (this.fieldId) this.errorRedirectParams.fieldId = this.fieldId;
          if (this.sportId) this.errorRedirectParams.sportId = this.sportId;
          if (this.fieldName) this.errorRedirectParams.fieldName = this.fieldName;
          if (this.recordingCode) this.errorRedirectParams.recordingCode = this.recordingCode;
          if (this.isRecordingMode) this.errorRedirectParams.recordingMode = 'true';
          
          // Show error modal
          this.showStartMatchErrorModal = true;
        }
      });
    } else {
      // Cannot start match without sport data (required for backend)
      console.error('Cannot start match: Sport data is required');
      return;
    }
  }

  chooseAttackingTeam(team: 'A' | 'B'): void {
    this.attackingTeamAtScolariGoal = team;
    this.showAttackingTeamModal = false;
    this.saveMatchState(); // Save state after selecting attacking team
  }

  private startMatchTimer(): void {
    this.isMatchStarted = true;
    this.isRecording = this.isRecordingMode; // Only start recording if in recording mode
    this.showControls = true;
    this.showFinalResult = false;
    this.teamAScore = 0;
    this.teamBScore = 0;

    const startEvent: MatchEvent = {
      dateTime: new Date().toISOString(),
      eventName: 'start',
      team: null,
      result: this.getCurrentResult()
    };
    this.events.push(startEvent);
    this.sendEventToBackend(startEvent);

    // Request wake lock to prevent screen from turning off
    this.requestWakeLock();

    // Save match start time
    this.matchStartTime = Date.now();
    this.saveMatchState();

    this.timerInterval = setInterval(() => {
      if (this.matchStartTime) {
        const currentTime = Date.now();
        this.secondsElapsed = Math.floor((currentTime - this.matchStartTime) / 1000);
        
        // Auto-finish match after 90 minutes (5400 seconds) for all matches
        if (this.secondsElapsed >= 5400) {
          this.autoFinishMatch();
        }
      }
    }, 1000);
  }

  finishMatch(): void {
    this.showConfirmModal = true;
  }

  private autoFinishMatch(): void {
    // Automatically finish match without showing confirmation modal
    if (this.isMatchFinished) {
      return; // Already finished
    }
    
    clearInterval(this.timerInterval);
    this.isMatchStarted = false;
    this.isRecording = false; // Stop recording
    this.isMatchFinished = true;
    this.showControls = false;
    this.showFinalResult = true;
    this.showConfirmModal = false; // Ensure modal is closed
    
    // Store finish time for duration calculation
    this.matchFinishTime = Date.now();
    
    // Release wake lock when match finishes
    this.releaseWakeLock();

    const finishEvent: MatchEvent = {
      dateTime: new Date().toISOString(),
      eventName: 'finish',
      team: null,
      result: this.getCurrentResult()
    };
    this.events.push(finishEvent);
    this.sendEventToBackend(finishEvent);
    
    // Clear saved match state when match finishes
    this.clearMatchState();

    // First call the finish endpoint with finalResult, then upload events
    if (this.gameId) {
      const finalResult = this.getCurrentResult();
      this.matchService.finishMatch(this.gameId, finalResult).subscribe({
        next: (response) => {
          console.log('Match finished automatically at 90 minutes:', response);
          // Upload events to backend after finishing the match
          this.downloadEvents();
          
          // Show timeout warning modal first
          this.showTimeoutModal = true;
        },
        error: (error) => {
          console.error('Error finishing match:', error);
          // Still try to upload events even if finish fails
          this.downloadEvents();
          
          // Show timeout warning modal first
          this.showTimeoutModal = true;
        }
      });
    } else {
      // Upload events to backend if no game ID (fallback)
      this.downloadEvents();
      
      // Show timeout warning modal first
      this.showTimeoutModal = true;
    }
  }

  onConfirmFinishMatch(): void {
    this.showConfirmModal = false;
    
    clearInterval(this.timerInterval);
    this.isMatchStarted = false;
    this.isRecording = false; // Stop recording
    this.isMatchFinished = true;
    this.showControls = false;
    this.showFinalResult = true;
    
    // Store finish time for duration calculation
    this.matchFinishTime = Date.now();
    
    // Release wake lock when match finishes
    this.releaseWakeLock();

    const finishEvent: MatchEvent = {
      dateTime: new Date().toISOString(),
      eventName: 'finish',
      team: null,
      result: this.getCurrentResult()
    };
    this.events.push(finishEvent);
    this.sendEventToBackend(finishEvent);
    
    // Clear saved match state when match finishes
    this.clearMatchState();

    // First call the finish endpoint with finalResult, then upload events
    if (this.gameId) {
      const finalResult = this.getCurrentResult();
      this.matchService.finishMatch(this.gameId, finalResult).subscribe({
        next: (response) => {
          console.log('Match finished successfully:', response);
          // Upload events to backend after finishing the match
          this.downloadEvents();
          
          // If in recording mode, show photo capture modal
          if (this.isRecordingMode) {
            this.isCapturingPhoto = true;
            this.photoUploadProgress = 0;
          }
        },
        error: (error) => {
          console.error('Error finishing match:', error);
          // Still try to upload events even if finish fails
          this.downloadEvents();
          
          // If in recording mode, show photo capture modal
          if (this.isRecordingMode) {
            this.isCapturingPhoto = true;
            this.photoUploadProgress = 0;
          }
        }
      });
      } else {
        // Upload events to backend if no game ID (fallback)
        this.downloadEvents();
        
        // If in recording mode, show photo capture modal
        if (this.isRecordingMode) {
          this.isCapturingPhoto = true;
          this.photoUploadProgress = 0;
        }
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
    const teamName = team === 'A' ? this.teamAName : this.teamBName;
    const goalEvent: MatchEvent = {
      dateTime: new Date().toISOString(),
      eventName: 'goal',
      team: teamName,
      result: this.getCurrentResult(),
      elapsedTime: elapsedTime
    };
    this.events.push(goalEvent);
    this.sendEventToBackend(goalEvent);

    this.addEventToLog(team, elapsedTime);
    this.saveMatchState(); // Save state after score change
  }

  addHighlight(): void {
    const elapsedTime = this.formatTime(this.secondsElapsed);
    const highlightEvent: MatchEvent = {
      dateTime: new Date().toISOString(),
      eventName: 'highlight',
      team: null,
      result: this.getCurrentResult(),
      elapsedTime: elapsedTime
    };
    this.events.push(highlightEvent);
    this.sendEventToBackend(highlightEvent);

    this.addEventToLog(null, elapsedTime);
    this.saveMatchState(); // Save state after event
  }

  // Team editing
  editTeam(team: 'A' | 'B'): void {
    // Open the combined teams edit modal instead
    this.openEditTeamsModal();
  }

  openEditTeamsModal(): void {
    this.showEditTeamsModal = true;
  }

  closeEditTeamsModal(): void {
    this.showEditTeamsModal = false;
  }

  onSaveBothTeams(teamAData: { name: string; color: string }, teamBData: { name: string; color: string }): void {
    this.teamAName = teamAData.name;
    this.teamAColor = teamAData.color;
    this.teamBName = teamBData.name;
    this.teamBColor = teamBData.color;
    this.showEditTeamsModal = false;
    
    this.saveMatchState(); // Save state after team changes

    // In recording mode, open the Attacking Team Selection Modal immediately
    // after saving teams, so that "Começar jogo" can start the timer right away.
    if (this.isRecordingMode && this.attackingTeamAtScolariGoal === null) {
      this.showAttackingTeamModal = true;
    }
  }


  // Utility functions
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getDisplayTime(): string {
    // For finished matches, secondsElapsed contains the match duration (finish - start)
    // For ongoing matches, secondsElapsed contains the current elapsed time
    // Both are already calculated correctly, so just format and display
    return this.formatTime(this.secondsElapsed);
  }

  formatTimeForEventLog(seconds: number): string {
    const minutes = Math.floor(seconds / 60) + 1;
    return `'${minutes}`;
  }

  convertTimeToEventLogFormat(timeString: string): string {
    // Convert from "mm:ss" format to "'mm" format
    const [minutes] = timeString.split(':');
    const minutesNumber = parseInt(minutes, 10) + 1;
    return `'${minutesNumber}`;
  }

  // Event preview methods for modal
  getCurrentEventTime(): string {
    if (this.originalEventIndex === null || !this.events[this.originalEventIndex]) {
      return "'0";
    }
    const event = this.events[this.originalEventIndex];
    return event.elapsedTime ? this.convertTimeToEventLogFormat(event.elapsedTime) : "'0";
  }

  getCurrentEventType(): string {
    if (this.originalEventIndex === null || !this.events[this.originalEventIndex]) {
      return "golo";
    }
    const event = this.events[this.originalEventIndex];
    return event.eventName === 'goal' ? 'golo' : 'highlight';
  }

  getCurrentEventResult(): string {
    if (this.originalEventIndex === null || !this.events[this.originalEventIndex]) {
      return "(0-0)";
    }
    const event = this.events[this.originalEventIndex];
    if (event.eventName === 'goal' && event.team) {
      return `(${this.teamAScore}-${this.teamBScore})`;
    }
    return "";
  }

  getNewEventType(): string {
    if (!this.editingEventType) return "golo";
    return this.editingEventType === 'goal' ? 'golo' : 'highlight';
  }

  getNewEventResult(): string {
    if (!this.editingEventType) return "0-0";
    
    const currentEvent = this.originalEventIndex !== null ? this.events[this.originalEventIndex] : null;
    let teamAScore = this.teamAScore;
    let teamBScore = this.teamBScore;
    
    // If current event is a goal, remove its score contribution
    if (currentEvent && currentEvent.eventName === 'goal') {
      if (currentEvent.team === this.teamAName) {
        teamAScore--;
      } else if (currentEvent.team === this.teamBName) {
        teamBScore--;
      }
    }
    
    // Add the new event's score contribution
    if (this.editingEventType === 'goal' && this.editingEventTeamSelection) {
      // Add the new goal to the selected team
      if (this.editingEventTeamSelection === 'A') {
        teamAScore++;
      } else {
        teamBScore++;
      }
    }
    // For highlights, no score is added (teamAScore and teamBScore remain as calculated above)
    
    return `${teamAScore}-${teamBScore}`;
  }

  getNewTeamAScore(): number {
    if (!this.editingEventType) return this.teamAScore;
    
    const currentEvent = this.originalEventIndex !== null ? this.events[this.originalEventIndex] : null;
    let teamAScore = this.teamAScore;
    
    // If current event is a goal, remove its score contribution
    if (currentEvent && currentEvent.eventName === 'goal' && currentEvent.team === this.teamAName) {
      teamAScore--;
    }
    
    // Add the new event's score contribution
    if (this.editingEventType === 'goal' && this.editingEventTeamSelection === 'A') {
      teamAScore++;
    }
    
    return teamAScore;
  }

  getNewTeamBScore(): number {
    if (!this.editingEventType) return this.teamBScore;
    
    const currentEvent = this.originalEventIndex !== null ? this.events[this.originalEventIndex] : null;
    let teamBScore = this.teamBScore;
    
    // If current event is a goal, remove its score contribution
    if (currentEvent && currentEvent.eventName === 'goal' && currentEvent.team === this.teamBName) {
      teamBScore--;
    }
    
    // Add the new event's score contribution
    if (this.editingEventType === 'goal' && this.editingEventTeamSelection === 'B') {
      teamBScore++;
    }
    
    return teamBScore;
  }

  // Check if team A score is being edited (will change)
  isTeamAScoreBeingEdited(): boolean {
    return this.editingEventType === 'goal' && this.editingEventTeamSelection === 'A';
  }

  // Check if team B score is being edited (will change)
  isTeamBScoreBeingEdited(): boolean {
    return this.editingEventType === 'goal' && this.editingEventTeamSelection === 'B';
  }

  // Helper method to convert hex color to rgba with opacity
  hexToRgba(hex: string, opacity: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${opacity})`;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Helper to get a darker shade of a hex color for SVG shadows/panels
  getDarkerColor(hex: string, factor: number = 0.25): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;

    const r = Math.max(0, Math.floor(parseInt(result[1], 16) * (1 - factor)));
    const g = Math.max(0, Math.floor(parseInt(result[2], 16) * (1 - factor)));
    const b = Math.max(0, Math.floor(parseInt(result[3], 16) * (1 - factor)));

    const toHex = (value: number) => value.toString(16).padStart(2, '0');

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Helper methods to get team color styles
  getTeamAStyle(): any {
    if (this.editingEventTeamSelection === 'A') {
      return {
        'border-color': this.teamAColor,
        'background': `white`,
        'box-shadow': `0 8px 20px ${this.hexToRgba(this.teamAColor, 0.25)}`
      };
    }
    return {
      'border-color': 'rgba(255, 255, 255, 0.2)',
      'background': 'rgba(255, 255, 255, 0.05)',
      'box-shadow': '0 2px 4px rgba(0, 0, 0, 0.2)'
    };
  }

  getTeamBStyle(): any {
    if (this.editingEventTeamSelection === 'B') {
      return {
        'border-color': this.teamBColor,
        'background': `white`,
        'box-shadow': `0 8px 20px ${this.hexToRgba(this.teamBColor, 0.25)}`
      };
    }
    return {
      'border-color': 'rgba(255, 255, 255, 0.2)',
      'background': 'rgba(255, 255, 255, 0.05)',
      'box-shadow': '0 2px 4px rgba(0, 0, 0, 0.2)'
    };
  }

  getCurrentResult(): string {
    return `${this.teamAScore}-${this.teamBScore}`;
  }

  // Backend synchronization methods for recording mode
  private syncEventUpdate(event: MatchEvent, newResult?: string): void {
    if (!this.isRecordingMode || !event.id) {
      return;
    }

    // Determine if zoom is required for the updated event:
    // - For goals: true when the event belongs to the team NOT attacking Scolari goal
    // - For highlights: null (no zoom information needed)
    let isZoomRequired: boolean | null = null;
    if (event.eventName === 'goal' && event.team && this.attackingTeamAtScolariGoal) {
      const attackingTeamName = this.attackingTeamAtScolariGoal === 'A' ? this.teamAName : this.teamBName;
      isZoomRequired = event.team !== attackingTeamName;
    } else if (event.eventName === 'highlight') {
      isZoomRequired = null;
    }

    const eventData: MatchEventRequestDto = {
      matchId: this.matchId!,
      dateTime: event.dateTime,
      eventName: event.eventName,
      teamName: event.team || undefined,
      result: newResult || event.result, // Use new result if provided, otherwise use event result
      fieldCameraId: this.fieldCameraId || undefined,
      isZoomRequired: isZoomRequired
    };

    this.matchService.updateMatchEvent(event.id, eventData).subscribe({
      next: (response) => {
        console.log('Event updated successfully:', response);
      },
      error: (error) => {
        console.error('Error updating event:', error);
      }
    });
  }

  private syncEventDelete(eventId: number): void {
    if (!this.isRecordingMode) {
      return;
    }

    this.matchService.deleteMatchEvent(eventId).subscribe({
      next: (response) => {
        console.log('Event deleted successfully:', response);
      },
      error: (error) => {
        console.error('Error deleting event:', error);
      }
    });
  }

  addEventToLog(team: 'A' | 'B' | null, elapsedTime: string): void {
    const result = this.getCurrentResult();
    const eventTime = this.formatTimeForEventLog(this.secondsElapsed);
    
    if (team === 'A') {
      this.teamAEvents.push({ text: `${eventTime} <i class="fas fa-futbol"></i>`, isUndone: false });
    } else if (team === 'B') {
      this.teamBEvents.push({ text: `<i class="fas fa-futbol"></i> ${eventTime}`, isUndone: false });
    } else {
      this.highlightEvents.push({ text: `<i class="fas fa-hands-clapping"></i> ${eventTime}`, isUndone: false });
    }
  }

  clearEvents(): void {
    this.events = [];
    this.teamAEvents = [];
    this.teamBEvents = [];
    this.highlightEvents = [];
  }

  private sendEventToBackend(event: MatchEvent): void {
    if (!this.isRecordingMode || !this.matchId) {
      return;
    }

    // Determine if zoom is required: true when the event belongs to the team NOT attacking Scolari goal
    let isZoomRequired = false;
    if (event.team && this.attackingTeamAtScolariGoal) {
      const attackingTeamName = this.attackingTeamAtScolariGoal === 'A' ? this.teamAName : this.teamBName;
      if (event.eventName !== 'start' && event.eventName !== 'finish') {
        isZoomRequired = event.team !== attackingTeamName;
      }
    }

    const eventData: IndividualMatchEventDto = {
      matchId: this.matchId,
      recordingCode: this.recordingCode || undefined,
      dateTime: event.dateTime,
      eventName: event.eventName,
      teamName: event.team || undefined,
      result: event.result,
      fieldCameraId: this.fieldId || undefined,
      isZoomRequired: isZoomRequired,
      elapsedTime: event.elapsedTime
    };

    this.matchService.sendIndividualEvent(eventData).subscribe({
      next: (response: any) => {
        console.log('Event sent successfully:', response);
        // Update the event with the backend ID
        if (response && response.id) {
          const eventIndex = this.events.findIndex(e => 
            e.dateTime === event.dateTime && 
            e.eventName === event.eventName && 
            e.team === event.team
          );
          if (eventIndex !== -1) {
            this.events[eventIndex].id = response.id;
          }
        }
      },
      error: (error) => {
        console.error('Error sending event:', error);
      }
    });
  }

  downloadEvents(): void {
    // Only upload events if not in recording mode (since events are sent individually in recording mode)
    if (!this.isRecordingMode) {
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
  }

  updateDateDisplay(): void {
    // This will be handled in the template
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }



  // Close QR modal
  // Navigate to video library with recording code
  onAccessVideo(): void {
    if (this.recordingCode) {
      this.router.navigate(['/media-library/recording-code', this.recordingCode]);
    } else {
      console.error('No recording code available for video access');
    }
  }

  // Photo capture methods
  private async captureMatchPhoto(): Promise<void> {
    if (!this.gameId) {
      console.error('No game ID available for photo upload');
      return;
    }

    try {
      // Hide the photo capture modal before opening camera
      this.isCapturingPhoto = false;
      
      // Capture photo using camera service with 10-second countdown
      const photoFile = await this.cameraService.capturePhoto(5);
      
      if (photoFile) {
        console.log('Photo captured, uploading...');
        this.photoUploadProgress = 1;
        this.lastCapturedPhotoUrl = URL.createObjectURL(photoFile);
        
        // Upload photo to backend with progress
        this.cameraService.uploadPhoto(this.gameId, photoFile).subscribe({
          next: (event: HttpEvent<any>) => {
            switch (event.type) {
              case HttpEventType.Sent:
                this.photoUploadProgress = 5;
                break;
              case HttpEventType.UploadProgress:
                if (event.total) {
                  this.photoUploadProgress = Math.min(99, Math.round(100 * (event.loaded / event.total)));
                }
                break;
              case HttpEventType.Response:
                this.photoUploadProgress = 100;
                this.isCapturingPhoto = false;
                // Show large preview modal that can be closed
            this.showPhotoPreviewModal = true;
                break;
            }
          },
          error: (error) => {
            console.error('Error uploading photo:', error);
            this.isCapturingPhoto = false;
            this.photoUploadProgress = 0;
            
            // Show error message but still show QR modal
            this.showPhotoUploadError();
          }
        });
      } else {
        // User cancelled photo capture or error occurred
        console.log('Photo capture cancelled or failed');
        this.isCapturingPhoto = false;
        this.photoUploadProgress = 0;
      }
    } catch (error) {
      console.error('Error during photo capture:', error);
      this.isCapturingPhoto = false;
      this.photoUploadProgress = 0;
      
      // Show error
      this.showPhotoUploadError();
    }
  }

  private showPhotoUploadSuccess(): void {
    // kept for potential future toast notification
    console.log('Photo uploaded successfully!');
  }

  private showPhotoUploadError(): void {
    // You can implement an error toast/notification here
    console.log('Photo upload failed');
  }

  // Method to retry photo capture
  retryPhotoCapture(): void {
    this.captureMatchPhoto();
  }

  // Method to skip photo capture
  skipPhotoCapture(): void {
    this.isCapturingPhoto = false;
    this.photoUploadProgress = 0;
  }

  // Close timeout modal and show photo capture modal if in recording mode
  onCloseTimeoutModal(): void {
    this.showTimeoutModal = false;
    
    // If in recording mode, show photo capture modal
    if (this.isRecordingMode) {
      this.isCapturingPhoto = true;
      this.photoUploadProgress = 0;
    }
  }

  // Close the large photo preview modal
  closePhotoPreview(): void {
    this.showPhotoPreviewModal = false;
    // Cleanup object URL if any
    if (this.lastCapturedPhotoUrl) {
      URL.revokeObjectURL(this.lastCapturedPhotoUrl);
      this.lastCapturedPhotoUrl = null;
    }
  }

  // Edit mode methods
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  saveEditMode(): void {
    this.isEditMode = false;
  }

  openEventEditModal(eventData: { index: number; team: 'A' | 'B' | null; eventType: 'goal' | 'highlight' }): void {
    this.editingEventIndex = eventData.index;
    this.editingEventTeam = eventData.team;
    this.editingEventType = eventData.eventType;
    
    // For highlights, default to 'A' for team selection in the modal
    // For goals, use the actual team
    this.editingEventTeamSelection = eventData.eventType === 'highlight' ? 'A' : (eventData.team || 'A');
    
    // Find the original event index in the events array
    this.originalEventIndex = this.findOriginalEventIndex(eventData);
    
    this.showEventEditModal = true;
  }

  closeEventEditModal(): void {
    this.showEventEditModal = false;
    this.editingEventTeam = null;
    this.editingEventIndex = null;
    this.editingEventType = null;
    this.originalEventIndex = null;
  }

  private findOriginalEventIndex(eventData: { index: number; team: 'A' | 'B' | null; eventType: 'goal' | 'highlight' }): number {
    // Find the corresponding event in the events array based on the original state
    let eventCount = 0;
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      
      if (eventData.eventType === 'highlight' && event.eventName === 'highlight') {
        if (eventCount === eventData.index) {
          return i;
        }
        eventCount++;
      } else if (eventData.eventType === 'goal' && event.eventName === 'goal' && eventData.team) {
        const eventTeam = event.team === this.teamAName ? 'A' : event.team === this.teamBName ? 'B' : null;
        if (eventTeam === eventData.team) {
          if (eventCount === eventData.index) {
            return i;
          }
          eventCount++;
        }
      }
    }
    
    return -1;
  }

  saveEventEdit(): void {
    if (this.originalEventIndex === null || !this.editingEventType) {
      return;
    }

    // Use the stored original event index
    const eventIndex = this.originalEventIndex;
    const currentEvent = this.events[eventIndex];
    const newEventType = this.editingEventType;
    const newTeam = this.editingEventType === 'goal' ? this.editingEventTeamSelection : null;
    const newTeamName = newTeam === 'A' ? this.teamAName : newTeam === 'B' ? this.teamBName : null;

    // Check if the event type or team changed
    const eventTypeChanged = currentEvent.eventName !== newEventType;
    const teamChanged = currentEvent.team !== newTeamName;

    // If the event type or team changed, we need to recalculate scores
    if (eventTypeChanged || teamChanged) {
      this.updateEventAndRecalculateScores(eventIndex, newEventType, newTeam);
      
      // Get the new result after the update
      const newResult = this.getNewEventResult();
      
      // Sync with backend in recording mode
      this.syncEventUpdate(this.events[eventIndex], newResult);
    }

    this.closeEventEditModal();
    this.isEditMode = false; // Exit edit mode after saving
    this.saveMatchState(); // Save state after editing event
  }

  deleteEvent(): void {
    if (this.originalEventIndex === null || !this.editingEventType) {
      return;
    }

    // Use the stored original event index
    const eventIndex = this.originalEventIndex;

    const eventToDelete = this.events[eventIndex];
    
    // If it's a goal, decrease the score
    if (eventToDelete.eventName === 'goal') {
      if (eventToDelete.team === this.teamAName) {
        this.teamAScore--;
      } else if (eventToDelete.team === this.teamBName) {
        this.teamBScore--;
      }
    }

    // Sync with backend in recording mode before deleting
    if (eventToDelete.id) {
      this.syncEventDelete(eventToDelete.id);
    }

    // Remove from events array
    this.events.splice(eventIndex, 1);

    // Remove from display arrays
    if (this.editingEventIndex !== null) {
      if (this.editingEventType === 'highlight') {
        this.highlightEvents.splice(this.editingEventIndex, 1);
      } else if (this.editingEventType === 'goal') {
        if (this.editingEventTeam === 'A') {
          this.teamAEvents.splice(this.editingEventIndex, 1);
        } else if (this.editingEventTeam === 'B') {
          this.teamBEvents.splice(this.editingEventIndex, 1);
        }
      }
    }

    this.closeEventEditModal();
    this.isEditMode = false; // Exit edit mode after deleting
    this.saveMatchState(); // Save state after deleting event
  }


  private updateEventAndRecalculateScores(eventIndex: number, newEventType: 'goal' | 'highlight', newTeam: 'A' | 'B' | null): void {
    const currentEvent = this.events[eventIndex];
    
    // First, undo the current event's effect on scores
    if (currentEvent.eventName === 'goal') {
      if (currentEvent.team === this.teamAName) {
        this.teamAScore--;
      } else if (currentEvent.team === this.teamBName) {
        this.teamBScore--;
      }
    }

    // Update the event
    currentEvent.eventName = newEventType;
    currentEvent.team = newTeam === 'A' ? this.teamAName : newTeam === 'B' ? this.teamBName : null;
    currentEvent.result = this.getCurrentResult();

    // Apply the new event's effect on scores
    if (newEventType === 'goal' && newTeam) {
      if (newTeam === 'A') {
        this.teamAScore++;
      } else if (newTeam === 'B') {
        this.teamBScore++;
      }
    }

    // Update the display arrays
    this.rebuildDisplayArrays();
  }

  private rebuildDisplayArrays(): void {
    // Clear current display arrays
    this.teamAEvents = [];
    this.teamBEvents = [];
    this.highlightEvents = [];

    // Rebuild from events array
    for (const event of this.events) {
      if (event.eventName === 'goal' && event.team) {
        const team = event.team === this.teamAName ? 'A' : 'B';
        const elapsedTime = event.elapsedTime || '00:00';
        // Convert elapsedTime to event log format
        const eventTimeFormatted = this.convertTimeToEventLogFormat(elapsedTime);
        
        if (team === 'A') {
          this.teamAEvents.push({ text: `${eventTimeFormatted} <i class="fas fa-futbol"></i>`, isUndone: false });
        } else {
          this.teamBEvents.push({ text: `<i class="fas fa-futbol"></i> ${eventTimeFormatted}`, isUndone: false });
        }
      } else if (event.eventName === 'highlight') {
        const elapsedTime = event.elapsedTime || '00:00';
        const eventTimeFormatted = this.convertTimeToEventLogFormat(elapsedTime);
        this.highlightEvents.push({ text: `<i class="fas fa-hands-clapping"></i> ${eventTimeFormatted}`, isUndone: false });
      }
    }
  }

  handleDragDropEvent(dragData: { index: number; team: 'A' | 'B' | null; eventType: 'goal' | 'highlight'; targetTeam?: 'A' | 'B' | null; action?: 'move' | 'delete' }): void {
    if (!dragData.action) return;

    // Find the original event index in the events array
    const originalEventIndex = this.findOriginalEventIndex({
      index: dragData.index,
      team: dragData.team,
      eventType: dragData.eventType
    });

    if (originalEventIndex === -1) return;

    const event = this.events[originalEventIndex];

    if (dragData.action === 'delete') {
      // Delete the event
      if (event.eventName === 'goal') {
        // Decrease the score
        if (event.team === this.teamAName) {
          this.teamAScore--;
        } else if (event.team === this.teamBName) {
          this.teamBScore--;
        }
      }

      // Sync with backend in recording mode before deleting
      if (event.id) {
        this.syncEventDelete(event.id);
      }

      // Remove from events array
      this.events.splice(originalEventIndex, 1);
    } else if (dragData.action === 'move' && dragData.targetTeam !== undefined) {
      // Move the event to a different team/type
      const newEventType = dragData.targetTeam === null ? 'highlight' : 'goal';
      const newTeam = dragData.targetTeam === null ? null : (dragData.targetTeam === 'A' ? this.teamAName : this.teamBName);

      // Update scores: remove old goal, add new goal if applicable
      if (event.eventName === 'goal') {
        if (event.team === this.teamAName) {
          this.teamAScore--;
        } else if (event.team === this.teamBName) {
          this.teamBScore--;
        }
      }

      // Update the event
      event.eventName = newEventType;
      event.team = newTeam;
      event.result = this.getCurrentResult();

      // Add score for new goal
      if (newEventType === 'goal' && newTeam) {
        if (newTeam === this.teamAName) {
          this.teamAScore++;
        } else if (newTeam === this.teamBName) {
          this.teamBScore++;
        }
      }

      // Sync with backend in recording mode
      const newResult = this.getCurrentResult();
      this.syncEventUpdate(event, newResult);
    }

    // Rebuild display arrays
    this.rebuildDisplayArrays();
    this.saveMatchState(); // Save state after drag/drop event changes
  }

  // Wake Lock API methods to prevent screen from turning off
  private async requestWakeLock(): Promise<void> {
    // Check if Wake Lock API is supported
    const nav = navigator as any;
    if ('wakeLock' in nav && nav.wakeLock) {
      try {
        // Request a screen wake lock
        this.wakeLock = await nav.wakeLock.request('screen');
        console.log('Wake lock acquired successfully');
        
        // Listen for release events (e.g., when user switches tabs or screen locks)
        if (this.wakeLock) {
          this.wakeLock.addEventListener('release', () => {
            console.log('Wake lock was released');
            // If match is still active, try to reacquire the wake lock
            if (this.isMatchStarted && !this.isMatchFinished) {
              this.requestWakeLock();
            }
          });
        }
      } catch (err: any) {
        // Wake lock request failed (e.g., user denied permission or feature not available)
        console.warn('Wake lock request failed:', err.message);
        // Continue without wake lock - the app will still function
      }
    } else {
      console.warn('Wake Lock API is not supported in this browser');
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release()
        .then(() => {
          console.log('Wake lock released successfully');
          this.wakeLock = null;
        })
        .catch((err: any) => {
          console.warn('Error releasing wake lock:', err);
          this.wakeLock = null;
        });
    }
  }

  private handleVisibilityChange = (): void => {
    // If the page becomes visible again and match is active, reacquire wake lock
    if (!document.hidden && this.isMatchStarted && !this.isMatchFinished && !this.wakeLock) {
      this.requestWakeLock();
    }
  };

  // Match state persistence methods
  private saveMatchState(): void {
    if (!this.isMatchStarted || this.isMatchFinished) {
      return; // Don't save if match hasn't started or is finished
    }

    const state: SavedMatchState = {
      matchStartTime: this.matchStartTime || Date.now(),
      gameId: this.gameId,
      matchId: this.matchId,
      teamAScore: this.teamAScore,
      teamBScore: this.teamBScore,
      teamAName: this.teamAName,
      teamBName: this.teamBName,
      teamAColor: this.teamAColor,
      teamBColor: this.teamBColor,
      events: this.events,
      isMatchStarted: this.isMatchStarted,
      isMatchFinished: this.isMatchFinished,
      isRecordingMode: this.isRecordingMode,
      fieldId: this.fieldId,
      sportId: this.sportId,
      recordingCode: this.recordingCode,
      attackingTeamAtScolariGoal: this.attackingTeamAtScolariGoal
    };

    try {
      localStorage.setItem(this.MATCH_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving match state to localStorage:', error);
    }
  }

  private restoreMatchState(): boolean {
    try {
      const savedStateJson = localStorage.getItem(this.MATCH_STATE_STORAGE_KEY);
      if (!savedStateJson) {
        return false;
      }

      const savedState: SavedMatchState = JSON.parse(savedStateJson);
      
      // Only restore if match was started and not finished
      if (!savedState.isMatchStarted || savedState.isMatchFinished) {
        this.clearMatchState();
        return false;
      }

      // Restore basic properties
      this.gameId = savedState.gameId;
      this.matchId = savedState.matchId;
      this.teamAScore = savedState.teamAScore;
      this.teamBScore = savedState.teamBScore;
      this.teamAName = savedState.teamAName;
      this.teamBName = savedState.teamBName;
      this.teamAColor = savedState.teamAColor;
      this.teamBColor = savedState.teamBColor;
      this.events = savedState.events || [];
      this.isMatchStarted = savedState.isMatchStarted;
      this.isMatchFinished = savedState.isMatchFinished;
      this.isRecordingMode = savedState.isRecordingMode;
      this.fieldId = savedState.fieldId;
      this.sportId = savedState.sportId;
      this.recordingCode = savedState.recordingCode;
      this.attackingTeamAtScolariGoal = savedState.attackingTeamAtScolariGoal;

      // Restore match start time and calculate elapsed time
      this.matchStartTime = savedState.matchStartTime;
      const currentTime = Date.now();
      this.secondsElapsed = Math.floor((currentTime - this.matchStartTime) / 1000);

      // Restore UI state
      this.showControls = this.isMatchStarted && !this.isMatchFinished;
      this.isRecording = this.isRecordingMode && this.isMatchStarted && !this.isMatchFinished;

      // Rebuild display arrays from events
      this.rebuildDisplayArrays();

      // Restart the timer
      this.timerInterval = setInterval(() => {
        if (this.matchStartTime) {
          const currentTime = Date.now();
          this.secondsElapsed = Math.floor((currentTime - this.matchStartTime) / 1000);
          
          // Save state every 10 seconds to keep it updated
          if (this.secondsElapsed % 10 === 0) {
            this.saveMatchState();
          }
          
          // Auto-finish match after 90 minutes (5400 seconds) for all matches
          if (this.secondsElapsed >= 5400) {
            this.autoFinishMatch();
          }
        }
      }, 1000);

      // Request wake lock
      this.requestWakeLock();

      console.log('Match state restored successfully');
      return true;
    } catch (error) {
      console.error('Error restoring match state from localStorage:', error);
      this.clearMatchState();
      return false;
    }
  }

  private loadMatchFromRecordingCode(): void {
    if (!this.recordingCode) {
      console.error('No recording code provided');
      return;
    }

    console.log('Loading match from recording code:', this.recordingCode);
    
    this.matchService.getMatchByRecordingCode(this.recordingCode).subscribe({
      next: (matchData) => {
        console.log('Match data loaded:', matchData);
        
        // Set basic match info
        this.matchId = matchData.id;
        this.gameId = matchData.matchCode;
        this.teamAName = matchData.teamAName;
        this.teamBName = matchData.teamBName;
        this.isRecordingMode = matchData.recordMode || false;
        
        // Set team colors if available (they might not be in the response)
        // Keep defaults if not provided
        
        // Load match events separately
        this.loadMatchEvents(matchData.id, () => {
          // Check if match is finished
          if (matchData.finishDateTime) {
            // Match is finished - show "aceder aos vídeos" button
            this.isMatchFinished = true;
            this.isMatchStarted = true; // Mark as started
            this.showFinalResult = true;
            this.showControls = false; // Hide action buttons
            
            // Store start and finish times for duration calculation
            if (matchData.startDateTime) {
              const startDate = new Date(matchData.startDateTime);
              this.matchStartTime = startDate.getTime();
            }
            const finishDate = new Date(matchData.finishDateTime);
            this.matchFinishTime = finishDate.getTime();
            
            // Calculate and set match duration
            if (this.matchStartTime && this.matchFinishTime) {
              const durationMs = this.matchFinishTime - this.matchStartTime;
              this.secondsElapsed = Math.floor(durationMs / 1000);
            }
            
            // Parse final result to get scores
            if (matchData.finalResult) {
              const scores = this.parseResult(matchData.finalResult);
              this.teamAScore = scores.teamA;
              this.teamBScore = scores.teamB;
            }
            
            console.log('Match is finished, showing video access button');
          } else if (matchData.startDateTime) {
            // Match is ongoing - restore timer and events
            this.restoreOngoingMatch(matchData);
          } else {
            // Match hasn't started yet - just set team info
            console.log('Match not started yet');
          }
        });
        
        // Prevent body scrolling when on score game page
        document.body.classList.add('no-scroll');
        
        // Listen for visibility changes to reacquire wake lock if needed
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
      },
      error: (error) => {
        console.error('Error loading match from recording code:', error);
        // If error, fall back to normal flow
        document.body.classList.add('no-scroll');
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        this.openEditTeamsModal();
      }
    });
  }

  private restoreOngoingMatch(matchData: any): void {
    console.log('Restoring ongoing match');
    
    // Set match state
    this.isMatchStarted = true;
    this.isMatchFinished = false;
    this.showControls = true;
    this.isRecording = this.isRecordingMode;
    
    // Parse startDateTime to get matchStartTime
    const startDate = new Date(matchData.startDateTime);
    this.matchStartTime = startDate.getTime();
    
    // Calculate elapsed time
    const currentTime = Date.now();
    this.secondsElapsed = Math.floor((currentTime - this.matchStartTime) / 1000);
    
    // Parse final result from last event or use current scores
    if (this.events && this.events.length > 0) {
      const lastEvent = this.events[this.events.length - 1];
      if (lastEvent.result) {
        const scores = this.parseResult(lastEvent.result);
        this.teamAScore = scores.teamA;
        this.teamBScore = scores.teamB;
      }
    }
    
    // Rebuild display arrays (events should already be loaded)
    this.rebuildDisplayArrays();
    
    // Start the timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      if (this.matchStartTime) {
        const currentTime = Date.now();
        this.secondsElapsed = Math.floor((currentTime - this.matchStartTime) / 1000);
        
        // Save state every 10 seconds to keep it updated
        if (this.secondsElapsed % 10 === 0) {
          this.saveMatchState();
        }
        
        // Auto-finish match after 90 minutes (5400 seconds)
        if (this.secondsElapsed >= 5400) {
          this.autoFinishMatch();
        }
      }
    }, 1000);
    
    // Save state
    this.saveMatchState();
    
    console.log('Ongoing match restored. Elapsed time:', this.secondsElapsed, 'seconds');
  }

  private loadMatchEvents(matchId: number, callback: () => void): void {
    console.log('Loading match events for matchId:', matchId);
    
    this.matchService.getMatchEventsByMatchId(matchId).subscribe({
      next: (matchEvents) => {
        console.log('Match events loaded:', matchEvents);
        
        // Convert backend events to MatchEvent format for display
        this.events = this.convertBackendEventsToMatchEvents(matchEvents);
        
        // Rebuild display arrays
        this.rebuildDisplayArrays();
        
        // Execute callback after events are loaded
        callback();
      },
      error: (error) => {
        console.error('Error loading match events:', error);
        // Continue even if events fail to load
        this.events = [];
        callback();
      }
    });
  }

  private convertBackendEventsToMatchEvents(backendEvents: any[]): MatchEvent[] {
    if (!backendEvents || backendEvents.length === 0) {
      return [];
    }
    
    // Sort events by dateTime (or eventDate as fallback) to ensure chronological order
    const sortedEvents = [...backendEvents].sort((a, b) => {
      const dateA = new Date(a.dateTime || a.eventDate).getTime();
      const dateB = new Date(b.dateTime || b.eventDate).getTime();
      return dateA - dateB;
    });
    
    return sortedEvents.map(event => {
      // Map eventTypeName to eventName
      let eventName: 'start' | 'finish' | 'goal' | 'highlight' = 'goal';
      if (event.eventTypeName) {
        const typeName = event.eventTypeName.toLowerCase();
        if (typeName === 'start') eventName = 'start';
        else if (typeName === 'finish') eventName = 'finish';
        else if (typeName === 'goal') eventName = 'goal';
        else if (typeName === 'highlight') eventName = 'highlight';
      }
      
      // Determine team name (null for highlights and start/finish events)
      let teamName: string | null = null;
      if (event.teamName && eventName !== 'highlight' && eventName !== 'start' && eventName !== 'finish') {
        // Check if it matches team A or B name
        if (event.teamName === this.teamAName) {
          teamName = this.teamAName;
        } else if (event.teamName === this.teamBName) {
          teamName = this.teamBName;
        } else {
          teamName = event.teamName;
        }
      }
      
      // Use dateTime, fallback to eventDate if dateTime is not available
      const eventDateTime = event.dateTime || event.eventDate;
      
      return {
        id: event.id,
        dateTime: eventDateTime,
        eventName: eventName,
        team: teamName,
        result: event.result || '0-0',
        elapsedTime: event.elapsedTime
      };
    });
  }

  private parseResult(resultString: string): { teamA: number; teamB: number } {
    // Parse result string like "2-1" to get scores
    const parts = resultString.split('-');
    if (parts.length === 2) {
      return {
        teamA: parseInt(parts[0].trim(), 10) || 0,
        teamB: parseInt(parts[1].trim(), 10) || 0
      };
    }
    return { teamA: 0, teamB: 0 };
  }

  private clearMatchState(): void {
    try {
      localStorage.removeItem(this.MATCH_STATE_STORAGE_KEY);
      this.matchStartTime = null;
    } catch (error) {
      console.error('Error clearing match state from localStorage:', error);
    }
  }
}
