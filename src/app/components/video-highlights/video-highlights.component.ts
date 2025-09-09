import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoHighlightsService, VideoHighlight } from '../../services/video-highlights.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-video-highlights',
  templateUrl: './video-highlights.component.html',
  styleUrls: ['./video-highlights.component.scss']
})
export class VideoHighlightsComponent implements OnInit {
  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;
  
  matchCode = '';
  videoHighlights: VideoHighlight[] = [];
  isLoading = false;
  errorMessage = '';
  selectedHighlights: VideoHighlight[] = [];
  currentPreviewHighlight: VideoHighlight | null = null;
  isVideoPlaying = false;

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
    console.error('Video error', videoElement.error);
  }

  // Method to get video URL from backend endpoint
  getVideoUrl(highlight: VideoHighlight): string {
    if (!highlight.presignedUrl) return '';
    return `${environment.apiUrl}/video-highlights/${highlight.id}/download`;
  }

  private async downloadHighlight(highlight: VideoHighlight): Promise<void> {
    try {
      this.videoHighlightsService.downloadVideoHighlight(highlight.id).subscribe({
        next: (blob: Blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = this.videoHighlightsService.buildFilenameForHighlight(highlight);
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(objectUrl);
        },
        error: (error) => {
          console.error('Download failed for highlight', highlight.id, error);
          throw error;
        }
      });
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


}
