import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoHighlightsService, VideoHighlight } from '../../services/video-highlights.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-video-highlights',
  templateUrl: './video-highlights.component.html',
  styleUrls: ['./video-highlights.component.scss']
})
export class VideoHighlightsComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;
  
  matchCode = '';
  videoHighlights: VideoHighlight[] = [];
  isLoading = false;
  errorMessage = '';
  selectedHighlights: VideoHighlight[] = [];
  currentPreviewHighlight: VideoHighlight | null = null;
  isVideoPlaying = false;
  private videoBlobCache = new Map<number, string>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public videoHighlightsService: VideoHighlightsService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['matchCode']) {
        this.matchCode = params['matchCode'];
        this.loadVideoHighlights();
      }
    });
  }

  loadVideoHighlights(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.videoHighlightsService.getVideoHighlights(this.matchCode).subscribe({
      next: (highlights: VideoHighlight[]) => {
        this.videoHighlights = highlights;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading video highlights:', error);
        this.errorMessage = 'Failed to load video highlights. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onBackClick(): void {
    this.router.navigate(['/download-video']);
  }

  onSelectHighlight(highlight: VideoHighlight): void {
    const isSelected = this.selectedHighlights.some(selected => selected.id === highlight.id);
    
    if (isSelected) {
      // Remove from selection
      this.selectedHighlights = this.selectedHighlights.filter(selected => selected.id !== highlight.id);
    } else {
      // Add to selection
      this.selectedHighlights.push(highlight);
    }
  }

  isHighlightSelected(highlight: VideoHighlight): boolean {
    return this.selectedHighlights.some(selected => selected.id === highlight.id);
  }

  removeSelectedHighlight(highlight: VideoHighlight): void {
    this.selectedHighlights = this.selectedHighlights.filter(selected => selected.id !== highlight.id);
  }

  onPreviewHighlight(highlight: VideoHighlight): void {
    if (!highlight.presignedUrl) {
      return;
    }

    if (this.currentPreviewHighlight?.id === highlight.id) {
      this.isVideoPlaying = !this.isVideoPlaying;
    } else {
      this.currentPreviewHighlight = highlight;
      this.isVideoPlaying = true;
      this.preloadVideo(highlight);
    }
  }

  toggleVideoPlayback(): void {
    if (this.currentPreviewHighlight && this.videoPlayer) {
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

  closeVideoPreview(): void {
    this.currentPreviewHighlight = null;
    this.isVideoPlaying = false;
  }

  onVideoLoaded(): void {}

  onVideoEnded(): void {}

  onVideoError(event: any): void {
    const videoElement = event.target as HTMLVideoElement;
    const error = videoElement.error;
    console.error('Video error', error);
    
    if (this.currentPreviewHighlight?.presignedUrl && videoElement.src === this.currentPreviewHighlight.presignedUrl) {
      console.warn('Presigned URL failed, attempting fallback to backend...');
      this.preloadVideo(this.currentPreviewHighlight);
    }
  }

  // Method to get video URL - prefer cached blob, then presigned, then backend
  getVideoUrl(highlight: VideoHighlight): string {
    if (!highlight) return '';
    const id = highlight.id;
    if (this.videoBlobCache.has(id)) {
      return this.videoBlobCache.get(id)!;
    }
    if (highlight.presignedUrl) {
      return highlight.presignedUrl;
    }
    return `${environment.apiUrl}/video-highlights/${id}/download`;
  }

  private async downloadHighlight(highlight: VideoHighlight): Promise<void> {
    let response: Response;
    let urlUsed: string;
    try {
      if (highlight.presignedUrl) {
        try {
          response = await fetch(highlight.presignedUrl, { method: 'GET', mode: 'cors' });
          if (!response.ok) {
            throw new Error(`Presigned URL returned ${response.status}: ${response.statusText}`);
          }
          urlUsed = highlight.presignedUrl;
        } catch (presignedError: any) {
          const shouldRetry = this.shouldRetryPresignedUrl(presignedError);
          console.warn(`Presigned URL failed for download of highlight ${highlight.id} (${presignedError.message}), ${shouldRetry ? 'falling back to backend' : 'not retrying'}`);
          if (shouldRetry) {
            const backendUrl = `${environment.apiUrl}/video-highlights/${highlight.id}/download`;
            response = await fetch(backendUrl, { method: 'GET' });
            urlUsed = backendUrl;
          } else {
            throw presignedError;
          }
        }
      } else {
        const backendUrl = `${environment.apiUrl}/video-highlights/${highlight.id}/download`;
        response = await fetch(backendUrl, { method: 'GET' });
        urlUsed = backendUrl;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch highlight from ${urlUsed}: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = this.videoHighlightsService.buildFilenameForHighlight(highlight);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed for highlight', highlight.id, error);
      throw error;
    }
  }

  async onDownloadSelected(): Promise<void> {
    if (this.selectedHighlights.length === 0) {
      alert('Please select at least one highlight to download.');
      return;
    }

    // Download sequentially to avoid overwhelming the browser and popup blockers
    for (const highlight of this.selectedHighlights) {
      try {
        await this.downloadHighlight(highlight);
      } catch (e) {
        console.error('Download failed for highlight', highlight.id, e);
      }
    }
  }

  // Helper method to check if presigned URL should be retried
  private shouldRetryPresignedUrl(error: any): boolean {
    if (error?.name === 'TypeError' && typeof error.message === 'string' && error.message.includes('Failed to fetch')) {
      return false;
    }
    if (typeof error?.message === 'string' && error.message.includes('404')) {
      return false;
    }
    return true; // retry for 403, 5xx, etc.
  }

  // Preload and cache the video as a blob URL, presigned first then backend fallback
  private async preloadVideo(highlight: VideoHighlight): Promise<void> {
    const id = highlight.id;
    if (this.videoBlobCache.has(id)) {
      return;
    }
    try {
      let response: Response;
      let urlUsed: string;
      if (highlight.presignedUrl) {
        try {
          response = await fetch(highlight.presignedUrl, { method: 'GET', mode: 'cors' });
          if (!response.ok) {
            throw new Error(`Presigned URL returned ${response.status}: ${response.statusText}`);
          }
          urlUsed = highlight.presignedUrl;
        } catch (presignedError: any) {
          const shouldRetry = this.shouldRetryPresignedUrl(presignedError);
          console.warn(`Presigned URL failed for highlight ${id} (${presignedError.message}), ${shouldRetry ? 'falling back to backend' : 'not retrying'}`);
          if (shouldRetry) {
            const backendUrl = `${environment.apiUrl}/video-highlights/${id}/download`;
            response = await fetch(backendUrl, { method: 'GET' });
            urlUsed = backendUrl;
          } else {
            throw presignedError;
          }
        }
      } else {
        const backendUrl = `${environment.apiUrl}/video-highlights/${id}/download`;
        response = await fetch(backendUrl, { method: 'GET' });
        urlUsed = backendUrl;
      }

      if (!response.ok) {
        console.error(`Failed to fetch highlight ${id} from ${urlUsed}: ${response.status}`);
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.videoBlobCache.set(id, blobUrl);
      if (this.currentPreviewHighlight?.id === highlight.id && this.videoPlayer) {
        this.videoPlayer.nativeElement.src = blobUrl;
      }
    } catch (error) {
      console.error(`Error preloading highlight ${id}:`, error);
    }
  }

  ngOnDestroy(): void {
    this.videoBlobCache.forEach(url => URL.revokeObjectURL(url));
    this.videoBlobCache.clear();
  }


}
