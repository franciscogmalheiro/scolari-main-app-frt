import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatchService, MatchEventResponseDto } from '../../services/match.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-selected-moments',
  templateUrl: './selected-moments.component.html',
  styleUrls: ['./selected-moments.component.scss']
})
export class SelectedMomentsComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;
  
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
  private videoUrlCache = new Map<number, string>(); // Cache for video URLs
  private videoBlobCache = new Map<number, string>(); // Cache for blob URLs

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
    if (!event.presignedUrl) {
      return;
    }

    if (this.currentPreviewEvent?.id === event.id) {
      this.isVideoPlaying = !this.isVideoPlaying;
    } else {
      this.currentPreviewEvent = event;
      this.isVideoPlaying = true;
      // Preload video if not cached
      this.preloadVideo(event);
    }
  }

  toggleVideoPlayback(): void {
    if (this.currentPreviewEvent && this.videoPlayer) {
      const videoElement = this.videoPlayer.nativeElement;
      if (this.isVideoPlaying) {
        videoElement.pause();
        this.isVideoPlaying = false;
      } else {
        videoElement.play().catch(() => {});
        this.isVideoPlaying = true;
      }
    }
  }

  // Check if video is ready to play
  isVideoReady(): boolean {
    if (!this.videoPlayer) return false;
    const videoElement = this.videoPlayer.nativeElement;
    return videoElement.readyState >= 2; // HAVE_CURRENT_DATA
  }

  isEventSelected(event: MatchEventResponseDto): boolean {
    return this.selectedEvents.some(selected => selected.id === event.id);
  }

  removeSelectedEvent(event: MatchEventResponseDto): void {
    this.selectedEvents = this.selectedEvents.filter(selected => selected.id !== event.id);
  }

  private buildFilenameForEvent(event: MatchEventResponseDto): string {
    const parts: string[] = [];
    if (event.elapsedTime) parts.push(event.elapsedTime.replace(/[^0-9A-Za-z_-]/g, ''));
    if (event.teamName) parts.push(event.teamName.replace(/[^0-9A-Za-z_-]/g, ''));
    if (event.eventTypeName) parts.push(event.eventTypeName.replace(/[^0-9A-Za-z_-]/g, ''));
    const base = parts.filter(Boolean).join('_') || `moment_${event.id}`;
    return `${base}.mp4`;
  }

  private async downloadEvent(event: MatchEventResponseDto): Promise<void> {
    const url = this.getVideoUrl(event);
    if (!url) return;

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = this.buildFilenameForEvent(event);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }

  async onDownloadSelected(): Promise<void> {
    if (this.selectedEvents.length === 0) {
      alert('Please select at least one moment to download.');
      return;
    }

    // Download sequentially to avoid overwhelming the browser and popup blockers
    for (const event of this.selectedEvents) {
      try {
        // Ensure each download is user-gesture adjacent by slight delay
        await this.downloadEvent(event);
      } catch (e) {
        console.error('Download failed for event', event.id, e);
      }
    }
  }

  closeVideoPreview(): void {
    this.currentPreviewEvent = null;
    this.isVideoPlaying = false;
  }

  onVideoLoaded(): void {}

  onVideoEnded(): void {}

  onVideoError(event: any): void {
    const videoElement = event.target as HTMLVideoElement;
    console.error('Video error', videoElement.error);
  }

  // Method to get video URL from backend endpoint
  getVideoUrl(event: MatchEventResponseDto): string {
    if (!event.presignedUrl) return '';
    const videoId = event.videoSegmentId;
    
    // Return cached blob URL if available
    if (this.videoBlobCache.has(videoId)) {
      return this.videoBlobCache.get(videoId)!;
    }
    
    // Return backend URL (will be replaced by blob URL after download)
    return `${environment.apiUrl}/video-segments/${videoId}/download`;
  }

  private async preloadVideo(event: MatchEventResponseDto): Promise<void> {
    const videoId = event.videoSegmentId;
    
    // Skip if already cached
    if (this.videoBlobCache.has(videoId)) {
      return;
    }
    
    try {
      const backendUrl = `${environment.apiUrl}/video-segments/${videoId}/download`;
      const response = await fetch(backendUrl, { method: 'GET' });
      
      if (!response.ok) {
        console.error(`Failed to fetch video ${videoId}: ${response.status}`);
        return;
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache the blob URL
      this.videoBlobCache.set(videoId, blobUrl);
      
      // Update the video source if this is the currently previewed event
      if (this.currentPreviewEvent?.id === event.id && this.videoPlayer) {
        this.videoPlayer.nativeElement.src = blobUrl;
      }
    } catch (error) {
      console.error(`Error preloading video ${videoId}:`, error);
    }
  }

  ngOnDestroy(): void {
    // Clean up blob URLs to prevent memory leaks
    this.videoBlobCache.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
    this.videoBlobCache.clear();
  }
} 