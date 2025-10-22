import { Component, OnInit, OnDestroy, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MediaLibraryService, MediaItemDto } from '../../services/media-library.service';
import { DownloadFormStateService } from '../../services/download-form-state.service';
import { environment } from '../../../environments/environment';
import { MatchService, FieldMatchResponseDto } from '../../services/match.service';

@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styleUrls: ['./media-library.component.scss']
})
export class MediaLibraryComponent implements OnInit, OnDestroy {
  @ViewChildren('itemVideo') itemVideos!: QueryList<ElementRef<HTMLVideoElement>>;

  matchCode = '';
  isRecordingCodeRoute = false;
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
  // Section expand/collapse state
  expandedResumo = true;
  expandedMoments = false;
  expandedPhotos = false;
  // Share modal state
  isShareModalOpen = false;
  shareItem: MediaItemDto | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private mediaLibraryService: MediaLibraryService,
    private downloadFormStateService: DownloadFormStateService,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['matchCode']) {
        this.matchCode = params['matchCode'];
        this.isRecordingCodeRoute = false;
        this.loadAllVideos();
        this.loadMatchDetails();
      } else if (params['recordingCode']) {
        this.matchCode = params['recordingCode'];
        this.isRecordingCodeRoute = true;
        this.loadAllVideos();
        this.loadMatchDetails();
      }
    });
  }

  private buildPageShareUrl(): string {
    const base = environment.publicBaseUrl && environment.publicBaseUrl.trim().length > 0
      ? environment.publicBaseUrl.replace(/\/$/, '')
      : window.location.origin;
    if (this.isRecordingCodeRoute) {
      return `${base}/media-library/recording-code/${this.matchCode}`;
    }
    return `${base}/media-library/${this.matchCode}`;
  }

  async onShareLibrary(): Promise<void> {
    // Open the existing share modal but for the page URL
    this.shareItem = null;
    this.isShareModalOpen = true;
  }

  loadAllVideos(): void {
    this.isLoadingEvents = true;
    this.errorMessage = '';

    const serviceCall = this.isRecordingCodeRoute 
      ? this.mediaLibraryService.getMediaLibraryByRecordingCode(this.matchCode)
      : this.mediaLibraryService.getMediaLibrary(this.matchCode);

    serviceCall.subscribe({
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

  // Match details
  matchDetails: FieldMatchResponseDto | null = null;

  private loadMatchDetails(): void {
    if (!this.matchCode) return;
    
    const serviceCall = this.isRecordingCodeRoute 
      ? this.matchService.getMatchByRecordingCode(this.matchCode)
      : this.matchService.getMatchByCode(this.matchCode);

    serviceCall.subscribe({
      next: (match) => {
        this.matchDetails = match;
      },
      error: (err) => {
        console.warn('Failed to load match details', err);
      }
    });
  }

  getMatchHeaderLine(): string {
    if (!this.matchDetails) return '';

    return this.matchDetails.teamAName + ' ' + this.matchDetails.finalResult + ' ' + this.matchDetails.teamBName;
  }

  getMatchDate(): string {
    if (!this.matchDetails?.startDateTime) return '';
    const d = new Date(this.matchDetails.startDateTime);
    return d.toLocaleDateString();
  }

  onBackClick(): void {
    this.downloadFormStateService.clearFormState();
    this.router.navigate(['/download-video']);
  }

  // Grouped lists
  get resumoItems(): MediaItemDto[] {
    return (this.allItems || []).filter(item => item.type === 'video-highlight');
  }

  get momentItems(): MediaItemDto[] {
    return (this.allItems || []).filter(item => item.type === 'goal-event' || item.type === 'highlight-event');
  }

  get photoItems(): MediaItemDto[] {
    return (this.allItems || []).filter(item => item.type === 'photo');
  }

  toggleSection(section: 'resumo' | 'momentos' | 'fotos'): void {
    if (section === 'resumo') {
      this.expandedResumo = !this.expandedResumo;
    } else if (section === 'momentos') {
      this.expandedMoments = !this.expandedMoments;
    } else if (section === 'fotos') {
      this.expandedPhotos = !this.expandedPhotos;
    }
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

  getItemTeamName(item: MediaItemDto): string {
    return item.teamName || '';
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

    // Reveal the video element but don't load the source yet
    setTimeout(() => {
      const videos = this.itemVideos?.toArray().map(ref => ref.nativeElement) || [];
      const target = videos.find(v => v.getAttribute('data-item-id') === item.id.toString());
      if (target) {
        target.classList.remove('hidden');
        // Only set source if video is already cached
        if (this.videoBlobCache.has(item.id)) {
          target.src = this.videoBlobCache.get(item.id)!;
          target.load();
        } else if (item.presignedUrl) {
          target.src = item.presignedUrl;
          target.load();
        }
      }
    }, 0);
  }

  toggleVideoPlayback(): void {}

  isVideoReady(): boolean {
    return true;
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

  // Check if an item has null presignedUrl or is processing
  hasNullPresignedUrl(item: MediaItemDto): boolean {
    return !item.presignedUrl || item.presignedUrl === null;
  }

  // Check if an item is being processed (show processing wheel)
  isItemProcessing(item: MediaItemDto): boolean {
    return item.processingStatus === 'PROCESSING' || 
           item.processingStatus === 'RETRYING' ||
           item.processingStatus === 'PENDING_EXTRACTION' ||
           item.processingStatus === 'WAITING_FOR_SEGMENTS';
  }

  // Check if an item processing failed
  isItemProcessingFailed(item: MediaItemDto): boolean {
    return item.processingStatus === 'PROCESSING_FAILED';
  }

  // Check if item should be disabled (processing or failed)
  isItemDisabled(item: MediaItemDto): boolean {
    return this.isItemProcessing(item) || this.isItemProcessingFailed(item);
  }

  // Check if any items in a section are processing (for retry button visibility)
  hasProcessingItemsInSection(section: 'resumo' | 'momentos' | 'fotos'): boolean {
    let items: MediaItemDto[] = [];
    switch (section) {
      case 'resumo':
        items = this.resumoItems;
        break;
      case 'momentos':
        items = this.momentItems;
        break;
      case 'fotos':
        items = this.photoItems;
        break;
    }
    return items.some(item => this.isItemProcessing(item));
  }

  // Legacy method - keeping for backward compatibility but using new status logic
  hasNullPresignedUrlInSection(section: 'resumo' | 'momentos' | 'fotos'): boolean {
    return this.hasProcessingItemsInSection(section);
  }

  // Retry loading for a specific section
  retrySection(section: 'resumo' | 'momentos' | 'fotos'): void {
    console.log(`Retrying section: ${section}`);
    this.loadAllVideos();
  }

  getResumoThumbnailUrl(item: MediaItemDto): string {
    // For Resumo videos, use the first photo as thumbnail if available
    if (item.type === 'video-highlight' && this.photoItems.length > 0) {
      return this.photoItems[0].presignedUrl || 'assets/resumo-thumnail.png';
    }
    // Fallback to default resumo thumbnail if no photo available
    return 'assets/resumo-thumnail.png';
  }

  getMomentoThumbnailUrl(item: MediaItemDto): string {
    // For goal events, always use golo thumbnail
    if (item.type === 'goal-event') {
      return 'assets/golo-thumbnail.png';
    }
    // For highlight events, use highlight thumbnail
    if (item.type === 'highlight-event') {
      return 'assets/highlight-thumbnail.png';
    }
    // Fallback to resumo thumbnail
    return 'assets/resumo-thumnail.png';
  }

  trackByItemId(index: number, item: MediaItemDto): number {
    return item.id;
  }

  ngOnDestroy(): void {
    this.videoBlobCache.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
    this.videoBlobCache.clear();
  }

  onVideoLoaded(event?: any): void {
    // Intentionally do nothing to avoid auto-play; user controls playback
  }

  onVideoPlay(event: any): void {
    const videoElement = event.target as HTMLVideoElement;
    const itemId = parseInt(videoElement.getAttribute('data-item-id') || '0');
    
    // If this video hasn't been cached yet, cache it now
    if (itemId && !this.videoBlobCache.has(itemId)) {
      this.cacheVideoOnPlay(itemId, videoElement);
    }
  }

  private async cacheVideoOnPlay(itemId: number, videoElement: HTMLVideoElement): Promise<void> {
    const item = this.allItems.find(i => i.id === itemId);
    if (!item) return;

    try {
      // Get the current source URL
      const currentSrc = videoElement.src;
      if (!currentSrc || currentSrc === 'about:blank') return;

      // Fetch the video and create blob URL
      const response = await fetch(currentSrc, { method: 'GET', mode: 'cors' });
      if (!response.ok) {
        console.warn(`Failed to cache video ${itemId}: ${response.status}`);
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache the blob URL
      this.videoBlobCache.set(itemId, blobUrl);
      
      // Update the video source to use the cached blob
      const currentTime = videoElement.currentTime;
      const wasPlaying = !videoElement.paused;
      
      videoElement.src = blobUrl;
      videoElement.load();
      
      // Restore playback state
      if (wasPlaying) {
        videoElement.currentTime = currentTime;
        videoElement.play().catch(console.error);
      }
    } catch (error) {
      console.error(`Error caching video ${itemId}:`, error);
    }
  }

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
      if (this.currentPreviewItem?.id === item.id) {
        const videos = this.itemVideos?.toArray().map(ref => ref.nativeElement) || [];
        const target = videos.find(v => v.getAttribute('src') === this.getItemUrl(item)) || videos.find(v => !v.classList.contains('hidden'));
        if (target) {
          target.src = blobUrl;
          target.load();
          // Do not auto-play after preloading; user initiates playback
        }
      }
    } catch (error) {
      console.error(`Error preloading video ${item.id}:`, error);
    }
  }

  async onDownloadItem(item: MediaItemDto): Promise<void> {
    await this.downloadItem(item);
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

  // Build shareable URL for an item
  private buildShareUrl(item: MediaItemDto): string {
    if (item.presignedUrl) {
      return item.presignedUrl;
    }
    if (this.isItemVideo(item)) {
      return this.getVideoUrl(item);
    }
    return this.getItemUrl(item);
  }

  async copyLink(item?: MediaItemDto): Promise<void> {
    const target = item || this.shareItem;
    const url = target ? this.buildShareUrl(target) : this.buildPageShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      // Optional: you could surface a toast here in the future
    } catch (e) {
      // Fallback: use a temporary input element
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  }

  shareToWhatsApp(item?: MediaItemDto): void {
    const target = item || this.shareItem;
    const url = target ? this.buildShareUrl(target) : this.buildPageShareUrl();
    const shareText = encodeURI('Aqui está o vídeo da bola desta semana: ')
    const waUrl = `https://wa.me/?text=${shareText}${encodeURIComponent(url)}`;
    window.open(waUrl, '_blank');
  }

  openShareModal(item?: MediaItemDto): void {
    this.shareItem = item || null;
    this.isShareModalOpen = true;
  }

  closeShareModal(): void {
    this.isShareModalOpen = false;
    this.shareItem = null;
  }
}


