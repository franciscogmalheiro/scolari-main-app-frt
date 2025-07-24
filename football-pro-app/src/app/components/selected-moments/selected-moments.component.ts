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
    if (this.currentCarouselIndex > 0) {
      this.currentCarouselIndex = Math.max(0, this.currentCarouselIndex - 3);
      this.animateCarousel('left');
    }
  }

  onCarouselNext(): void {
    if (this.currentCarouselIndex + 3 < this.matchEvents.length) {
      this.currentCarouselIndex = Math.min(this.matchEvents.length - 3, this.currentCarouselIndex + 3);
      this.animateCarousel('right');
    }
  }

  private animateCarousel(direction: 'left' | 'right'): void {
    const eventsGrid = document.querySelector('.events-grid') as HTMLElement;
    if (eventsGrid) {
      // Add slide animation class
      eventsGrid.style.transform = direction === 'left' ? 'translateX(20px)' : 'translateX(-20px)';
      
      // Reset transform after animation
      setTimeout(() => {
        eventsGrid.style.transform = 'translateX(0)';
      }, 300);
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
    console.log('Previewing moment:', event);
    alert(`Previewing ${event.eventTypeName} at ${event.elapsedTime} for ${event.teamName}`);
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
} 