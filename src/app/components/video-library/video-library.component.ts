import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatchService, MatchEventResponseDto } from '../../services/match.service';
import { VideoHighlightsService, VideoHighlight } from '../../services/video-highlights.service';
import { DownloadFormStateService } from '../../services/download-form-state.service';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-video-library',
  templateUrl: './video-library.component.html',
  styleUrls: ['./video-library.component.scss']
})
export class VideoLibraryComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;
  
  matchCode = '';
  matchEvents: MatchEventResponseDto[] = [];
  videoHighlights: VideoHighlight[] = [];
  allVideos: (MatchEventResponseDto | VideoHighlight)[] = [];
  isLoadingEvents = false;
  errorMessage = '';
  selectedEvents: (MatchEventResponseDto | VideoHighlight)[] = [];
  Math = Math; // Make Math available in template
  currentPreviewEvent: (MatchEventResponseDto | VideoHighlight) | null = null;
  isVideoPlaying = false;
  private videoUrlCache = new Map<number, string>(); // Cache for video URLs
  private videoBlobCache = new Map<number, string>(); // Cache for blob URLs

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private matchService: MatchService,
    private videoHighlightsService: VideoHighlightsService,
    private downloadFormStateService: DownloadFormStateService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['matchCode']) {
        this.matchCode = params['matchCode'];
        this.loadAllVideos();
      }
    });
  }

  loadAllVideos(): void {
    this.isLoadingEvents = true;
    this.errorMessage = '';
    
    const matchEventsCall = this.matchService.getMatchEvents(this.matchCode);
    const videoHighlightsCall = this.videoHighlightsService.getVideoHighlights(this.matchCode);

    forkJoin([matchEventsCall, videoHighlightsCall]).subscribe({
      next: ([matchEvents, videoHighlights]) => {
        this.matchEvents = matchEvents || [];
        this.videoHighlights = videoHighlights || [];
        
        // Combine videos with highlights first
        this.allVideos = [...this.videoHighlights, ...this.matchEvents];
        this.isLoadingEvents = false;
      },
      error: (error) => {
        console.error('Error loading videos:', error);
        this.errorMessage = 'Failed to load videos. Please try again.';
        this.isLoadingEvents = false;
      }
    });
  }

  // Removed carousel navigation and animations

  onBackClick(): void {
    // Clear any saved form state to reset the download form
    this.downloadFormStateService.clearFormState();
    this.router.navigate(['/download-video']);
  }

  getEventIcon(event: MatchEventResponseDto | VideoHighlight): string {
    if ('eventTypeName' in event) {
      return event.eventTypeName === 'Goal' ? '⚽' : '⭐';
    } else {
      return '🎬'; // Video highlight icon
    }
  }

  getEventTime(event: MatchEventResponseDto | VideoHighlight): string {
    if ('elapsedTime' in event) {
      return event.elapsedTime;
    } else {
      return 'Resumo';
    }
  }

  getEventName(event: MatchEventResponseDto | VideoHighlight): string {
    if ('teamName' in event) {
      return event.teamName;
    } else {
      return '';
    }
  }

  isMatchEvent(event: MatchEventResponseDto | VideoHighlight): event is MatchEventResponseDto {
    return 'eventTypeName' in event;
  }

  isGoal(event: MatchEventResponseDto | VideoHighlight): boolean {
    return this.isMatchEvent(event) && event.eventTypeName === 'Goal' && !!(event as MatchEventResponseDto).result;
  }

  getEventResult(event: MatchEventResponseDto | VideoHighlight): string {
    if (this.isMatchEvent(event) && event.result) {
      return event.result;
    }
    return '';
  }

  onSelectMoment(event: MatchEventResponseDto | VideoHighlight): void {
    const isSelected = this.selectedEvents.some(selected => selected.id === event.id);
    
    if (isSelected) {
      // Remove from selection
      this.selectedEvents = this.selectedEvents.filter(selected => selected.id !== event.id);
    } else {
      // Add to selection
      this.selectedEvents.push(event);
    }
  }

  onPreviewMoment(event: MatchEventResponseDto | VideoHighlight): void {
    if (!event.presignedUrl) {
      return;
    }
    this.currentPreviewEvent = event;
    this.isVideoPlaying = true;
    this.preloadVideo(event);
  }

  toggleVideoPlayback(): void {}

  // Check if video is ready to play
  isVideoReady(): boolean {
    if (!this.videoPlayer) return false;
    const videoElement = this.videoPlayer.nativeElement;
    return videoElement.readyState >= 2; // HAVE_CURRENT_DATA
  }

  isEventSelected(event: MatchEventResponseDto | VideoHighlight): boolean {
    return this.selectedEvents.some(selected => selected.id === event.id);
  }

  removeSelectedEvent(event: MatchEventResponseDto | VideoHighlight): void {
    this.selectedEvents = this.selectedEvents.filter(selected => selected.id !== event.id);
  }

  private buildFilenameForEvent(event: MatchEventResponseDto | VideoHighlight): string {
    const parts: string[] = [];
    if ('elapsedTime' in event && event.elapsedTime) parts.push(event.elapsedTime.replace(/[^0-9A-Za-z_-]/g, ''));
    if ('teamName' in event && event.teamName) parts.push(event.teamName.replace(/[^0-9A-Za-z_-]/g, ''));
    if ('eventTypeName' in event && event.eventTypeName) parts.push(event.eventTypeName.replace(/[^0-9A-Za-z_-]/g, ''));
    if (!('elapsedTime' in event)) parts.push('highlight');
    const base = parts.filter(Boolean).join('_') || `video_${event.id}`;
    return `${base}.mp4`;
  }

  private async downloadEvent(event: MatchEventResponseDto | VideoHighlight): Promise<void> {
    let response: Response;
    let urlUsed: string;
    
    try {
      // Try presigned URL first if available
      if (event.presignedUrl) {
        try {
          response = await fetch(event.presignedUrl, { 
            method: 'GET',
            mode: 'cors' // Explicitly set CORS mode
          });
          
          // Check if response is ok (not 403, 404, etc.)
          if (!response.ok) {
            throw new Error(`Presigned URL returned ${response.status}: ${response.statusText}`);
          }
          
          urlUsed = event.presignedUrl;
        } catch (presignedError: any) {
          const shouldRetry = this.shouldRetryPresignedUrl(presignedError);
          const videoId = 'videoSegmentId' in event ? event.videoSegmentId : event.id;
          console.warn(`Presigned URL failed for download of video ${videoId} (${presignedError.message}), ${shouldRetry ? 'falling back to backend' : 'not retrying'}`);
          
          if (shouldRetry) {
            // Fallback to backend URL
            const backendUrl = 'videoSegmentId' in event ? 
              `${environment.apiUrl}/video-segments/${event.videoSegmentId}/download` :
              `${environment.apiUrl}/video-highlights/${event.id}/download`;
            response = await fetch(backendUrl, { method: 'GET' });
            urlUsed = backendUrl;
          } else {
            throw presignedError; // Re-throw if we shouldn't retry
          }
        }
      } else {
        // No presigned URL, use backend directly
        const backendUrl = 'videoSegmentId' in event ? 
          `${environment.apiUrl}/video-segments/${event.videoSegmentId}/download` :
          `${environment.apiUrl}/video-highlights/${event.id}/download`;
        response = await fetch(backendUrl, { method: 'GET' });
        urlUsed = backendUrl;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video from ${urlUsed}: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = this.buildFilenameForEvent(event);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      const videoId = 'videoSegmentId' in event ? event.videoSegmentId : event.id;
      console.error(`Error downloading video ${videoId}:`, error);
      throw error;
    }
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
    const error = videoElement.error;
    console.error('Video error', error);
    
    // Check if we're using a presigned URL and it failed
    if (this.currentPreviewEvent?.presignedUrl && videoElement.src === this.currentPreviewEvent.presignedUrl) {
      console.warn('Presigned URL failed, attempting fallback to backend...');
      this.preloadVideo(this.currentPreviewEvent);
    } else if (error && error.code) {
      // Log specific error codes for debugging
      const errorMessages = {
        1: 'MEDIA_ERR_ABORTED',
        2: 'MEDIA_ERR_NETWORK', 
        3: 'MEDIA_ERR_DECODE',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
      };
      console.warn(`Video error code ${error.code}: ${errorMessages[error.code as keyof typeof errorMessages] || 'Unknown error'}`);
    }
  }

  // Helper method to check if presigned URL should be retried
  private shouldRetryPresignedUrl(error: any): boolean {
    // Don't retry if it's a network error or CORS issue
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return false;
    }
    // Don't retry if it's a 404 (file not found)
    if (error.message && error.message.includes('404')) {
      return false;
    }
    // Retry for 403 (expired), 500 (server error), etc.
    return true;
  }

  // Method to get video URL - prioritizes presigned URL over backend endpoint
  getVideoUrl(event: MatchEventResponseDto | VideoHighlight): string {
    const videoId = 'videoSegmentId' in event ? event.videoSegmentId : event.id;
    
    // Return cached blob URL if available
    if (this.videoBlobCache.has(videoId)) {
      return this.videoBlobCache.get(videoId)!;
    }
    
    // Prioritize presigned URL if available
    if (event.presignedUrl) {
      return event.presignedUrl;
    }
    
    // Fallback to backend URL
    if ('videoSegmentId' in event) {
      return `${environment.apiUrl}/video-segments/${videoId}/download`;
    } else {
      return `${environment.apiUrl}/video-highlights/${videoId}/download`;
    }
  }

  private async preloadVideo(event: MatchEventResponseDto | VideoHighlight): Promise<void> {
    const videoId = 'videoSegmentId' in event ? event.videoSegmentId : event.id;
    
    // Skip if already cached
    if (this.videoBlobCache.has(videoId)) {
      return;
    }
    
    try {
      let response: Response;
      let urlUsed: string;
      
      // Try presigned URL first if available
      if (event.presignedUrl) {
        try {
          response = await fetch(event.presignedUrl, { 
            method: 'GET',
            mode: 'cors' // Explicitly set CORS mode
          });
          
          // Check if response is ok (not 403, 404, etc.)
          if (!response.ok) {
            throw new Error(`Presigned URL returned ${response.status}: ${response.statusText}`);
          }
          
          urlUsed = event.presignedUrl;
        } catch (presignedError: any) {
          const shouldRetry = this.shouldRetryPresignedUrl(presignedError);
          console.warn(`Presigned URL failed for video ${videoId} (${presignedError.message}), ${shouldRetry ? 'falling back to backend' : 'not retrying'}`);
          
          if (shouldRetry) {
            // Fallback to backend URL
            const backendUrl = 'videoSegmentId' in event ? 
              `${environment.apiUrl}/video-segments/${videoId}/download` :
              `${environment.apiUrl}/video-highlights/${videoId}/download`;
            response = await fetch(backendUrl, { method: 'GET' });
            urlUsed = backendUrl;
          } else {
            throw presignedError; // Re-throw if we shouldn't retry
          }
        }
      } else {
        // No presigned URL, use backend directly
        const backendUrl = 'videoSegmentId' in event ? 
          `${environment.apiUrl}/video-segments/${videoId}/download` :
          `${environment.apiUrl}/video-highlights/${videoId}/download`;
        response = await fetch(backendUrl, { method: 'GET' });
        urlUsed = backendUrl;
      }
      
      if (!response.ok) {
        console.error(`Failed to fetch video ${videoId} from ${urlUsed}: ${response.status}`);
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