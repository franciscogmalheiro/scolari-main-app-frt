import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TeamEditData } from '../team-edit-modal/team-edit-modal.component';
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

@Component({
  selector: 'app-score-game',
  templateUrl: './score-game.component.html',
  styleUrls: ['./score-game.component.scss', './event-edit-modal.scss']
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
  matchId: number | null = null; // This will contain the match ID from the backend
  fieldCameraId: number | null = null; // Field camera ID for recording mode
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
  
  // Photo capture state
  isCapturingPhoto = false;
  photoUploadProgress = 0;
  lastCapturedPhotoUrl: string | null = null;
  showPhotoPreviewModal = false;

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
  sportName: string = '';

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private matchService: MatchService,
    private cameraService: CameraService
  ) {}

  ngOnInit(): void {
    this.updateDateDisplay();
    this.checkGameMode();
    // Prevent body scrolling when on score game page
    document.body.classList.add('no-scroll');
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

  private doStartMatch(): void {
    console.log('doStartMatch called with fieldId:', this.fieldId, 'sportId:', this.sportId);
    
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
        recordMode: this.isRecordingMode
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
          // Cannot start match without backend game ID
          console.error('Cannot start match: Backend game ID is required');
          return;
        }
      });
    } else {
      // Cannot start match without sport data (required for backend)
      console.error('Cannot start match: Sport data is required');
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

    const startEvent: MatchEvent = {
      dateTime: new Date().toISOString(),
      eventName: 'start',
      team: null,
      result: this.getCurrentResult()
    };
    this.events.push(startEvent);
    this.sendEventToBackend(startEvent);

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

    const finishEvent: MatchEvent = {
      dateTime: new Date().toISOString(),
      eventName: 'finish',
      team: null,
      result: this.getCurrentResult()
    };
    this.events.push(finishEvent);
    this.sendEventToBackend(finishEvent);

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
          } else {
            // Show QR modal if not in recording mode
            this.showQrModal = true;
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
          } else {
            this.showQrModal = true;
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
      } else {
        this.showQrModal = true;
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
    return event.eventName === 'goal' ? 'golo' : 'destaque';
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
    return this.editingEventType === 'goal' ? 'golo' : 'destaque';
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

  getCurrentResult(): string {
    return `${this.teamAScore}-${this.teamBScore}`;
  }

  // Backend synchronization methods for recording mode
  private syncEventUpdate(event: MatchEvent, newResult?: string): void {
    if (!this.isRecordingMode || !event.id) {
      return;
    }

    const eventData: MatchEventRequestDto = {
      matchId: this.matchId!,
      dateTime: event.dateTime,
      eventName: event.eventName,
      teamName: event.team || undefined,
      result: newResult || event.result, // Use new result if provided, otherwise use event result
      fieldCameraId: this.fieldCameraId || undefined
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
      this.teamAEvents.push({ text: `${eventTime} ⚽`, isUndone: false });
    } else if (team === 'B') {
      this.teamBEvents.push({ text: `⚽ ${eventTime}`, isUndone: false });
    } else {
      this.highlightEvents.push({ text: `⭐ ${eventTime}`, isUndone: false });
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

    const eventData: IndividualMatchEventDto = {
      matchId: this.matchId,
      dateTime: event.dateTime,
      eventName: event.eventName,
      teamName: event.team || undefined,
      result: event.result,
      fieldCameraId: this.fieldId || undefined
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
  onCloseQrModal(): void {
    this.showQrModal = false;
  }

  // Photo capture methods
  private async captureMatchPhoto(): Promise<void> {
    if (!this.gameId) {
      console.error('No game ID available for photo upload');
      this.showQrModal = true; // Fallback to QR modal
      return;
    }

    try {
      // Hide the photo capture modal before opening camera
      this.isCapturingPhoto = false;
      
      // Capture photo using camera service with 10-second countdown
      const photoFile = await this.cameraService.capturePhoto(10);
      
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
        
        // Show QR modal anyway
        this.showQrModal = true;
      }
    } catch (error) {
      console.error('Error during photo capture:', error);
      this.isCapturingPhoto = false;
      this.photoUploadProgress = 0;
      
      // Show error and fallback to QR modal
      this.showPhotoUploadError();
    }
  }

  private showPhotoUploadSuccess(): void {
    // kept for potential future toast notification
    console.log('Photo uploaded successfully!');
  }

  private showPhotoUploadError(): void {
    // You can implement an error toast/notification here
    console.log('Photo upload failed, showing QR modal anyway');
    
    // Show QR modal as fallback
    this.showQrModal = true;
  }

  // Method to retry photo capture
  retryPhotoCapture(): void {
    this.captureMatchPhoto();
  }

  // Method to skip photo capture
  skipPhotoCapture(): void {
    this.isCapturingPhoto = false;
    this.photoUploadProgress = 0;
    this.showQrModal = true;
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
    this.isEditMode = false;
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
        const eventTime = this.convertTimeToEventLogFormat(elapsedTime);
        
        if (team === 'A') {
          this.teamAEvents.push({ text: `⚽ ${eventTime}`, isUndone: false });
        } else {
          this.teamBEvents.push({ text: `⚽ ${eventTime}`, isUndone: false });
        }
      } else if (event.eventName === 'highlight') {
        const elapsedTime = event.elapsedTime || '00:00';
        const eventTime = this.convertTimeToEventLogFormat(elapsedTime);
        this.highlightEvents.push({ text: `⭐ ${eventTime}`, isUndone: false });
      }
    }
  }
}
