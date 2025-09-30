import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MediaLibraryService, MediaItemDto } from '../../services/media-library.service';
import { DownloadFormStateService } from '../../services/download-form-state.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styleUrls: ['./media-library.component.scss']
})
export class MediaLibraryComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer', { static: false }) videoPlayer!: ElementRef<HTMLVideoElement>;

  matchCode = '';
  mediaItems: MediaItemDto[] = [];
  allItems: MediaItemDto[] = [];
  isLoadingEvents = false;
  errorMessage = '';
  selectedItems: MediaItemDto[] = [];
  Math = Math;
  currentPreviewItem: MediaItemDto | null = null;
  isVideoPlaying = false;
  currentPhoto: MediaItemDto | null = null;
  private videoUrlCache = new Map<number, string>();
  private videoBlobCache = new Map<number, string>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private mediaLibraryService: MediaLibraryService,
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

    this.mediaLibraryService.getMediaLibrary(this.matchCode).subscribe({
      next: (mediaItems) => {
        this.mediaItems = mediaItems || [];
        this.allItems = this.mediaItems;
        this.isLoadingEvents = false;
      },
      error: (error) => {
        console.error('Error loading media library:', error);
        this.errorMessage = 'Failed to load media library. Please try again.';
        this.isLoadingEvents = false;
      }
    });
  }

  onBackClick(): void {
    this.downloadFormStateService.clearFormState();
    this.router.navigate(['/download-video']);
  }

  getItemIcon(item: MediaItemDto): string {
    switch (item.type) {
      case 'photo':
        return '📷';
      case 'goal-event':
        return '⚽';
      case 'highlight-event':
        return '⭐';
      case 'video-highlight':
        return '🎬';
      default:
        return '📁';
    }
  }

  getItemDescription(item: MediaItemDto): string {
    switch (item.type) {
      case 'goal-event':
        return item.elapsedTime || '';
      case 'highlight-event':
        return item.elapsedTime || '';
      case 'video-highlight':
        return 'Resumo';
      case 'photo':
        return 'Foto final';
      default:
        return '';
    }
  }

  getItemName(item: MediaItemDto): string {
    if (item.type === 'photo') {
      return item.name || `photo_${item.id}`;
    }
    return item.name || 'Media Item';
  }

  isItemGoal(item: MediaItemDto): boolean {
    return item.type === 'goal-event' && !!item.result;
  }

  getItemResult(item: MediaItemDto): string {
    return item.result || '';
  }

  onSelectItem(item: MediaItemDto): void {
    const isSelected = this.selectedItems.some(selected => selected.id === item.id);
    this.selectedItems = isSelected
      ? this.selectedItems.filter(selected => selected.id !== item.id)
      : [...this.selectedItems, item];
  }

  onPreviewItem(item: MediaItemDto): void {
    if (!item.presignedUrl) {
      return;
    }
    this.currentPreviewItem = item;
    this.isVideoPlaying = true;

    if (this.videoBlobCache.has(item.id) && this.videoPlayer) {
      this.videoPlayer.nativeElement.src = this.videoBlobCache.get(item.id)!;
      this.videoPlayer.nativeElement.play().catch(error => {
        console.warn('Video play failed:', error);
      });
    }
  }

  toggleVideoPlayback(): void {}

  isVideoReady(): boolean {
    if (!this.videoPlayer) return false;
    const videoElement = this.videoPlayer.nativeElement;
    return videoElement.readyState >= 2;
  }

  isItemSelected(item: MediaItemDto): boolean {
    return this.selectedItems.some(selected => selected.id === item.id);
  }

  openPhoto(photo: MediaItemDto): void {
    this.currentPreviewItem = photo;
  }

  onItemClick(item: MediaItemDto, $event: MouseEvent): void {
    if (this.isItemPhoto(item)) {
      this.openPhoto(item);
      return;
    }
    this.onPreviewItem(item);
    $event.stopPropagation();
  }

  getItemId(item: MediaItemDto): number {
    return item.id;
  }

  isItemPhoto(item: MediaItemDto): boolean {
    return item.type === 'photo';
  }

  isItemVideo(item: MediaItemDto): boolean {
    return ['video-highlight', 'goal-event', 'highlight-event'].includes(item.type);
  }

  removeSelectedItem(item: MediaItemDto): void {
    this.selectedItems = this.selectedItems.filter(selected => selected.id !== item.id);
  }

  getSelectedCount(): number {
    return this.selectedItems.length;
  }

  getItemUrl(item: MediaItemDto): string {
    return item.presignedUrl || '';
  }

  trackByItemId(index: number, item: MediaItemDto): number {
    return item.id;
  }

  ngOnDestroy(): void {
    this.videoBlobCache.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
    this.videoBlobCache.clear();
  }

  onVideoLoaded(): void {}

  onVideoEnded(event: any): void {
    const videoElement = event.target as HTMLVideoElement;
    if (document.fullscreenElement === videoElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
    videoElement.pause();
    this.currentPreviewItem = null;
    this.isVideoPlaying = false;
  }

  onVideoError(event: any): void {
    const videoElement = event.target as HTMLVideoElement;
    const error = videoElement.error;
    console.error('Video error', error);

    if (this.currentPreviewItem?.presignedUrl && videoElement.src === this.currentPreviewItem.presignedUrl) {
      console.warn('Presigned URL failed, attempting fallback to backend...');
      this.preloadVideo(this.currentPreviewItem);
    } else if (error && error.code) {
      const errorMessages: any = { 1: 'MEDIA_ERR_ABORTED', 2: 'MEDIA_ERR_NETWORK', 3: 'MEDIA_ERR_DECODE', 4: 'MEDIA_ERR_SRC_NOT_SUPPORTED' };
      console.warn(`Video error code ${error.code}: ${errorMessages[error.code] || 'Unknown error'}`);
    }
  }

  private shouldRetryPresignedUrl(error: any): boolean {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return false;
    }
    if (error.message && error.message.includes('404')) {
      return false;
    }
    return true;
  }

  getVideoUrl(item: MediaItemDto): string {
    if (this.videoBlobCache.has(item.id)) {
      return this.videoBlobCache.get(item.id)!;
    }
    if (item.presignedUrl) {
      return item.presignedUrl;
    }
    if (item.type === 'video-highlight') {
      return `${environment.apiUrl}/video-highlights/${item.id}/download`;
    } else if (item.type === 'goal-event' || item.type === 'highlight-event') {
      return `${environment.apiUrl}/video-segments/${item.id}/download`;
    }
    return item.presignedUrl || '';
  }

  private async preloadVideo(item: MediaItemDto): Promise<void> {
    if (this.videoBlobCache.has(item.id)) {
      return;
    }
    try {
      let response: Response;
      let urlUsed: string = '';
      if (item.presignedUrl) {
        try {
          response = await fetch(item.presignedUrl, { method: 'GET', mode: 'cors' });
          if (!response.ok) {
            throw new Error(`Presigned URL returned ${response.status}: ${response.statusText}`);
          }
          urlUsed = item.presignedUrl;
        } catch (presignedError: any) {
          const shouldRetry = this.shouldRetryPresignedUrl(presignedError);
          if (shouldRetry) {
            const backendUrl = this.getVideoUrl(item);
            response = await fetch(backendUrl, { method: 'GET' });
            urlUsed = backendUrl;
          } else {
            throw presignedError;
          }
        }
      } else {
        const backendUrl = this.getVideoUrl(item);
        response = await fetch(backendUrl, { method: 'GET' });
        urlUsed = backendUrl;
      }
      if (!response.ok) {
        console.error(`Failed to fetch video ${item.id} from ${urlUsed}: ${response.status}`);
        return;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.videoBlobCache.set(item.id, blobUrl);
      if (this.currentPreviewItem?.id === item.id && this.videoPlayer) {
        this.videoPlayer.nativeElement.src = blobUrl;
        this.videoPlayer.nativeElement.play().catch(error => {
          console.warn('Video autoplay failed:', error);
        });
      }
    } catch (error) {
      console.error(`Error preloading video ${item.id}:`, error);
    }
  }

  private async downloadItem(item: MediaItemDto): Promise<void> {
    try {
      const url = item.presignedUrl;
      if (!url) {
        throw new Error(`No presigned URL available for item ${item.id}`);
      }
      const response = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to fetch item ${item.id}: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = this.buildFilenameForItem(item);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error(`Error downloading item ${item.id}:`, error);
      throw error;
    }
  }

  private buildFilenameForItem(item: MediaItemDto): string {
    const parts: string[] = [];
    if (item.elapsedTime) {
      parts.push(item.elapsedTime.replace(/[^0-9A-Za-z_-]/g, ''));
    }
    if (item.type === 'goal-event') {
      parts.push('goal');
    } else if (item.type === 'highlight-event') {
      parts.push('highlight');
    } else if (item.type === 'video-highlight') {
      parts.push('video-highlight');
    } else if (item.type === 'photo') {
      parts.push('photo');
    }
    const base = parts.filter(Boolean).join('_') || `${item.type}_${item.id}`;
    const extension = item.type === 'photo' ? 'jpg' : 'mp4';
    return `${base}.${extension}`;
  }

  async onDownloadSelected(): Promise<void> {
    if (this.getSelectedCount() === 0) {
      alert('Please select at least one item to download.');
      return;
    }
    for (const item of this.selectedItems) {
      try {
        await this.downloadItem(item);
      } catch (e) {
        console.error('Download failed for item', item.id, e);
      }
    }
  }
}


