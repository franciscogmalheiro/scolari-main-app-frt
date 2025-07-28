import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatchService, MatchEventResponseDto } from '../../services/match.service';

@Component({
  selector: 'app-selected-moments',
  templateUrl: './selected-moments.component.html',
  styleUrls: ['./selected-moments.component.scss']
})
export class SelectedMomentsComponent implements OnInit {
  matchCode = '';
  matchEvents: MatchEventResponseDto[] = [];
  currentCarouselIndex = 0;
  isLoadingEvents = false;
  errorMessage = '';
  selectedEvents: MatchEventResponseDto[] = [];
  Math = Math; // Make Math available in template
  isAnimating = false;
  currentPreviewEvent: MatchEventResponseDto | null = null;
  isVideoPlaying = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['matchCode']) {
        this.matchCode = params['matchCode'];
        this.loadMatchEvents();
      }
    });
  }

  loadMatchEvents(): void {
    this.isLoadingEvents = true;
    this.errorMessage = '';
    
    this.matchService.getMatchEvents(this.matchCode).subscribe({
      next: (events) => {
        this.matchEvents = events;
        this.isLoadingEvents = false;
      },
      error: (error) => {
        console.error('Error loading match events:', error);
        this.errorMessage = 'Failed to load match events. Please try again.';
        this.isLoadingEvents = false;
      }
    });
  }

  onCarouselPrevious(): void {
    if (this.currentCarouselIndex > 0 && !this.isAnimating) {
      this.isAnimating = true;
      this.animateCarousel('left', () => {
        this.currentCarouselIndex = Math.max(0, this.currentCarouselIndex - 3);
        this.isAnimating = false;
      });
    }
  }

  onCarouselNext(): void {
    if (this.currentCarouselIndex + 3 < this.matchEvents.length && !this.isAnimating) {
      this.isAnimating = true;
      this.animateCarousel('right', () => {
        this.currentCarouselIndex = Math.min(this.matchEvents.length - 3, this.currentCarouselIndex + 3);
        this.isAnimating = false;
      });
    }
  }

  private animateCarousel(direction: 'left' | 'right', callback: () => void): void {
    const eventsGrid = document.querySelector('.events-grid') as HTMLElement;
    if (eventsGrid) {
      // Add slide animation class
      const slideClass = direction === 'left' ? 'slide-left' : 'slide-right';
      eventsGrid.classList.add(slideClass);
      
      // Remove class and execute callback after animation
      setTimeout(() => {
        eventsGrid.classList.remove(slideClass);
        callback();
      }, 400);
    }
  }

  onBackClick(): void {
    this.router.navigate(['/download-video']);
  }

  getEventIcon(eventTypeName: string): string {
    return eventTypeName === 'Goal' ? '⚽' : '⭐';
  }

  onSelectMoment(event: MatchEventResponseDto): void {
    const isSelected = this.selectedEvents.some(selected => selected.id === event.id);
    
    if (isSelected) {
      // Remove from selection
      this.selectedEvents = this.selectedEvents.filter(selected => selected.id !== event.id);
    } else {
      // Add to selection
      this.selectedEvents.push(event);
    }
  }

  onPreviewMoment(event: MatchEventResponseDto): void {
    if (!event.previewUrl) {
      console.log('No preview URL available for this event');
      alert('Video preview not available for this moment.');
      return;
    }

    if (this.currentPreviewEvent?.id === event.id) {
      // Toggle video playback for the same event
      this.isVideoPlaying = !this.isVideoPlaying;
    } else {
      // Start preview for a new event
      this.currentPreviewEvent = event;
      this.isVideoPlaying = true;
    }
  }

  toggleVideoPlayback(): void {
    if (this.currentPreviewEvent) {
      this.isVideoPlaying = !this.isVideoPlaying;
    }
  }

  isEventSelected(event: MatchEventResponseDto): boolean {
    return this.selectedEvents.some(selected => selected.id === event.id);
  }

  removeSelectedEvent(event: MatchEventResponseDto): void {
    this.selectedEvents = this.selectedEvents.filter(selected => selected.id !== event.id);
  }

  onDownloadSelected(): void {
    if (this.selectedEvents.length === 0) {
      alert('Please select at least one moment to download.');
      return;
    }
    
    console.log('Downloading selected moments:', this.selectedEvents);
    alert(`Downloading ${this.selectedEvents.length} selected moment(s)...`);
  }

  closeVideoPreview(): void {
    this.currentPreviewEvent = null;
    this.isVideoPlaying = false;
  }

  onVideoLoaded(): void {
    console.log('Video loaded successfully');
  }

  onVideoEnded(): void {
    // Video ended, but since we have loop=true, it will restart automatically
    console.log('Video ended');
  }
} 