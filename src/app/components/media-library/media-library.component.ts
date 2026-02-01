import { Component, OnInit, OnDestroy, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MediaLibraryService, MediaItemDto } from '../../services/media-library.service';
import { DownloadFormStateService } from '../../services/download-form-state.service';
import { environment } from '../../../environments/environment';
import { MatchService, FieldMatchResponseDto } from '../../services/match.service';
import { AuthService } from '../../services/auth.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styleUrls: ['./media-library.component.scss']
})
export class MediaLibraryComponent implements OnInit, OnDestroy {
  @ViewChildren('itemVideo') itemVideos!: QueryList<ElementRef<HTMLVideoElement>>;

  recordingCode = '';
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
  // Track if match has been added to user's games
  isMatchAddedToFavorites = false;
  // Track if zoom is inverted (from API response)
  zoomInverted = false;
  // Registration popup state
  isRegistrationModalOpen = false;
  // Information modal state for first-time logged-in users
  isInfoModalOpen = false;
  private readonly INFO_MODAL_SEEN_KEY = 'media_library_info_modal_seen';

  // Polling for processing videos
  private pollingSubscription?: Subscription;
  private readonly POLLING_INTERVAL_MS = 30000; // 30 seconds
  private processingItemIds = new Set<number>(); // Track IDs of items that are processing

  // Store bound fullscreen change handler for cleanup
  private fullscreenChangeHandler = () => this.handleFullscreenChange();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private mediaLibraryService: MediaLibraryService,
    private downloadFormStateService: DownloadFormStateService,
    private matchService: MatchService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      console.log('params', params);
      if (params['recordingCode']) {
        this.recordingCode = params['recordingCode'];
        this.isRecordingCodeRoute = false;
        this.loadAllVideos();
        this.loadMatchDetails();
      } else if (params['recordingCode']) {
        this.recordingCode = params['recordingCode'];
        this.isRecordingCodeRoute = true;
        this.loadAllVideos();
        this.loadMatchDetails();
      }
    });

    // Listen for fullscreen exit events to reset preview state
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', this.fullscreenChangeHandler);

    // Check if we should show the info modal for first-time logged-in users
    this.checkAndShowInfoModal();
  }

  private checkAndShowInfoModal(): void {
    // Only show for authenticated users
    if (!this.isAuthenticated()) {
      return;
    }

    // Check if user has already seen the modal
    const hasSeenModal = localStorage.getItem(this.INFO_MODAL_SEEN_KEY) === 'true';
    
    if (!hasSeenModal) {
      // Show modal after a short delay to ensure page is loaded
      setTimeout(() => {
        this.isInfoModalOpen = true;
      }, 500);
    }
  }

  closeInfoModal(): void {
    this.isInfoModalOpen = false;
    // Mark as seen in localStorage
    localStorage.setItem(this.INFO_MODAL_SEEN_KEY, 'true');
  }

  private buildPageShareUrl(): string {
    const base = environment.publicBaseUrl && environment.publicBaseUrl.trim().length > 0
      ? environment.publicBaseUrl.replace(/\/$/, '')
      : window.location.origin;
    return `${base}/media-library/recording-code/${this.recordingCode}`;
  
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
      ? this.mediaLibraryService.getMediaLibraryByRecordingCode(this.recordingCode)
      : this.mediaLibraryService.getMediaLibrary(this.recordingCode);

    serviceCall.subscribe({
      next: (mediaItems) => {
        this.mediaItems = mediaItems || [];
        this.allItems = this.mediaItems;
        this.isLoadingEvents = false;
        // Update tracking of processing items and start/stop polling
        this.updateProcessingItemsTracking();
        this.managePolling();
      },
      error: (error) => {
        console.error('Error loading media library:', error);
        this.errorMessage = 'Failed to load media library. Please try again.';
        this.isLoadingEvents = false;
      }
    });
  }

  // Update only processing items without reloading the whole component
  private updateProcessingItems(): void {
    if (!this.recordingCode) return;

    const serviceCall = this.isRecordingCodeRoute 
      ? this.mediaLibraryService.getMediaLibraryByRecordingCode(this.recordingCode)
      : this.mediaLibraryService.getMediaLibrary(this.recordingCode);

    serviceCall.subscribe({
      next: (mediaItems) => {
        const updatedItems = mediaItems || [];
        
        // Create a map of new items by ID for quick lookup
        const newItemsMap = new Map<number, MediaItemDto>();
        updatedItems.forEach(item => newItemsMap.set(item.id, item));

        // Update items that were previously processing (or are currently processing)
        // This ensures we update cards that transition from processing to ready
        const itemsToUpdate = new Set<number>();
        this.allItems.forEach(item => {
          if (this.processingItemIds.has(item.id)) {
            itemsToUpdate.add(item.id);
          }
        });
        // Also check for items in the new data that are processing
        updatedItems.forEach(item => {
          if (this.isItemProcessing(item)) {
            itemsToUpdate.add(item.id);
          }
        });

        // Update only the items we're tracking
        this.allItems = this.allItems.map(existingItem => {
          if (itemsToUpdate.has(existingItem.id)) {
            const updatedItem = newItemsMap.get(existingItem.id);
            if (updatedItem) {
              // Preserve selection state if item was selected
              const wasSelected = this.selectedItems.some(selected => selected.id === existingItem.id);
              if (wasSelected) {
                // Update the selected item reference
                const selectedIndex = this.selectedItems.findIndex(selected => selected.id === existingItem.id);
                if (selectedIndex >= 0) {
                  this.selectedItems[selectedIndex] = updatedItem;
                }
              }
              return updatedItem;
            }
          }
          return existingItem;
        });

        // Keep mediaItems in sync with allItems
        this.mediaItems = [...this.allItems];

        // Update processing items tracking after merge
        this.updateProcessingItemsTracking();
        
        // Stop polling if no items are processing anymore
        this.managePolling();
      },
      error: (error) => {
        console.error('Error updating processing items:', error);
        // Don't show error to user for background polling failures
      }
    });
  }

  // Track which items are currently in processing status
  private updateProcessingItemsTracking(): void {
    this.processingItemIds.clear();
    this.allItems.forEach(item => {
      if (this.isItemProcessing(item)) {
        this.processingItemIds.add(item.id);
      }
    });
  }

  // Start or stop polling based on whether there are processing items
  private managePolling(): void {
    const hasProcessingItems = this.processingItemIds.size > 0;

    if (hasProcessingItems && !this.pollingSubscription) {
      // Start polling
      this.pollingSubscription = interval(this.POLLING_INTERVAL_MS).subscribe(() => {
        this.updateProcessingItems();
      });
    } else if (!hasProcessingItems && this.pollingSubscription) {
      // Stop polling
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  // Match details
  matchDetails: FieldMatchResponseDto | null = null;

  private loadMatchDetails(): void {
    if (!this.recordingCode) return;
    
    const serviceCall = this.isRecordingCodeRoute 
      ? this.matchService.getMatchByRecordingCode(this.recordingCode)
      : this.matchService.getMatchByCode(this.recordingCode);

    serviceCall.subscribe({
      next: (match) => {
        this.matchDetails = match;
        // Update isMatchAddedToFavorites based on isFavorite flag from API
        this.isMatchAddedToFavorites = match.isFavorite === true;
        // Update zoomInverted based on zoomInverted flag from API
        this.zoomInverted = match.zoomInverted === true;
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
    return this.formatDate(this.matchDetails.startDateTime);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month}, ${year}`;
  }

  onBackClick(): void {
    this.downloadFormStateService.clearFormState();
    this.router.navigate(['/home']);
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
        return '<i class="fas fa-camera"></i>';
      case 'goal-event':
        return '<i class="fas fa-futbol"></i>';
      case 'highlight-event':
        return '<i class="fas fa-hands-clapping"></i>';
      case 'video-highlight':
        return '<i class="fas fa-film"></i>';
      default:
        return '<i class="fas fa-folder"></i>';
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
    this.isVideoPlaying = true;

    // Reveal the video element and load the source, then go fullscreen and play
    // Don't set currentPreviewItem to avoid expanding the card
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

        // Request fullscreen and play when video is ready
        const playAndFullscreen = () => {
          // Request fullscreen
          if (target.requestFullscreen) {
            target.requestFullscreen().then(() => {
              target.play().catch(console.error);
            }).catch(console.error);
          } else if ((target as any).webkitRequestFullscreen) {
            (target as any).webkitRequestFullscreen();
            target.play().catch(console.error);
          } else if ((target as any).mozRequestFullScreen) {
            (target as any).mozRequestFullScreen();
            target.play().catch(console.error);
          } else if ((target as any).msRequestFullscreen) {
            (target as any).msRequestFullscreen();
            target.play().catch(console.error);
          } else {
            // Fallback: just play if fullscreen is not supported
            target.play().catch(console.error);
          }
        };

        // Wait for video to be ready before playing
        if (target.readyState >= 2) {
          // Video already has enough data
          playAndFullscreen();
        } else {
          // Wait for video to load
          const onCanPlay = () => {
            playAndFullscreen();
            target.removeEventListener('canplay', onCanPlay);
          };
          target.addEventListener('canplay', onCanPlay);
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
    if (!photo.presignedUrl) {
      return;
    }

    // Create a fullscreen container for the photo
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.zIndex = '9999';
    container.style.cursor = 'pointer';

    const img = document.createElement('img');
    img.src = photo.presignedUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.style.userSelect = 'none';

    // Close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.style.background = 'rgba(0, 0, 0, 0.7)';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.color = 'white';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '1.2rem';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.zIndex = '10000';

    const closeFullscreen = () => {
      if (document.fullscreenElement) {
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
      document.body.removeChild(container);
    };

    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFullscreen();
    });

    container.addEventListener('click', (e) => {
      if (e.target === container) {
        closeFullscreen();
      }
    });

    container.appendChild(img);
    container.appendChild(closeButton);
    document.body.appendChild(container);

    // Request fullscreen on the container
    const requestFullscreen = () => {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(console.error);
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    };

    // Request fullscreen immediately
    requestFullscreen();

    // Also listen for fullscreen exit to clean up
    const handleFullscreenExit = () => {
      if (!document.fullscreenElement && 
          !(document as any).webkitFullscreenElement && 
          !(document as any).mozFullScreenElement && 
          !(document as any).msFullscreenElement) {
        if (container.parentNode) {
          document.body.removeChild(container);
        }
        document.removeEventListener('fullscreenchange', handleFullscreenExit);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenExit);
        document.removeEventListener('mozfullscreenchange', handleFullscreenExit);
        document.removeEventListener('MSFullscreenChange', handleFullscreenExit);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenExit);
    document.addEventListener('webkitfullscreenchange', handleFullscreenExit);
    document.addEventListener('mozfullscreenchange', handleFullscreenExit);
    document.addEventListener('MSFullscreenChange', handleFullscreenExit);
  }

  onItemClick(item: MediaItemDto, $event: MouseEvent): void {
    $event.stopPropagation();
    if (this.isItemPhoto(item)) {
      this.openPhoto(item);
      return;
    }
    this.onPreviewItem(item);
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
    // Stop polling
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }

    this.videoBlobCache.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
    this.videoBlobCache.clear();

    // Remove fullscreen event listeners
    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
  }

  private handleFullscreenChange(): void {
    // Check if we exited fullscreen
    if (!document.fullscreenElement && 
        !(document as any).webkitFullscreenElement && 
        !(document as any).mozFullScreenElement && 
        !(document as any).msFullscreenElement) {
      // Reset preview state when exiting fullscreen
      this.currentPreviewItem = null;
      this.isVideoPlaying = false;
      
      // Hide all video elements that were shown
      const videos = this.itemVideos?.toArray().map(ref => ref.nativeElement) || [];
      videos.forEach(video => {
        if (!video.classList.contains('hidden')) {
          video.classList.add('hidden');
          video.pause();
        }
      });
    }
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

  // Extract segment name from presignedUrl (filename without extension)
  private extractSegmentName(presignedUrl: string): string | null {
    try {
      const urlParts = presignedUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      if (!filename) return null;
      // Remove extension
      const segmentName = filename.replace(/\.[^/.]+$/, '');
      return segmentName;
    } catch (e) {
      return null;
    }
  }

  // Extract recordingCode from presignedUrl path
  // Format: https://cdn.scolari-app.pt/videos/.../{recordingCode}/segments/{segmentName}.mp4
  private extractRecordingCode(presignedUrl: string): string | null {
    try {
      const url = new URL(presignedUrl);
      const pathParts = url.pathname.split('/');
      const segmentsIndex = pathParts.indexOf('segments');
      if (segmentsIndex > 0) {
        // The recordingCode should be the part before 'segments'
        return pathParts[segmentsIndex - 1];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Build shareable URL for an item
  private buildShareUrl(item: MediaItemDto): string {
    const base = environment.publicBaseUrl && environment.publicBaseUrl.trim().length > 0
      ? environment.publicBaseUrl.replace(/\/$/, '')
      : window.location.origin;
    
    let videoUrl: string;
    if (item.presignedUrl) {
      videoUrl = item.presignedUrl;
    } else if (this.isItemVideo(item)) {
      videoUrl = this.getVideoUrl(item);
    } else {
      videoUrl = this.getItemUrl(item);
    }
    
    // Extract recordingCode and segmentName
    // Prefer using this.recordingCode if available (from component context)
    const recordingCode = this.recordingCode || this.extractRecordingCode(videoUrl);
    const segmentName = this.extractSegmentName(videoUrl);
    
    if (recordingCode && segmentName) {
      // Use video-player route with recordingCode and segmentName
      // Encode both parameters for URL safety
      const encodedRecordingCode = encodeURIComponent(recordingCode);
      const encodedSegmentName = encodeURIComponent(segmentName);
      return `${base}/video-player/${encodedRecordingCode}/${encodedSegmentName}`;
    }
    
    // Fallback to old format if extraction fails
    return `${base}/video-player?url=${encodeURIComponent(videoUrl)}`;
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
    const shareText = target 
      ? encodeURI('Clica neste link para veres um dos vídeos do jogo: ')
      : encodeURI('Revê aqui os melhores momentos do teu jogo: ');
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

  isUserRole(): boolean {
    const user = this.authService.currentUserValue;
    return user?.role === 'USER';
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated;
  }

  isVideoSegmentAdded(item: MediaItemDto): boolean {
    // Use the isFavorite flag from the backend
    return item.isFavorite === true;
  }

  onAddToMyGoals(item: MediaItemDto): void {
    if (!item.id) {
      return;
    }

    // Check if user is authenticated
    if (!this.isAuthenticated()) {
      this.isRegistrationModalOpen = true;
      return;
    }

    const isCurrentlyAdded = this.isVideoSegmentAdded(item);

    if (isCurrentlyAdded) {
      // Remove from favorites
      this.mediaLibraryService.removeMatchEventFromUser(item.id).subscribe({
        next: () => {
          // Update the isFavorite flag on the item
          item.isFavorite = false;
        },
        error: (error) => {
          console.error('Error removing video segment from user goals:', error);
        }
      });
    } else {
      // Add to favorites
      this.mediaLibraryService.addMatchEventToUser(item.id).subscribe({
        next: () => {
          // Update the isFavorite flag on the item
          item.isFavorite = true;
        },
        error: (error) => {
          console.error('Error adding video segment to user goals:', error);
        }
      });
    }
  }

  onAddToMyGames(): void {
    if (!this.recordingCode || !this.matchDetails) {
      return;
    }

    // Check if user is authenticated
    if (!this.isAuthenticated()) {
      this.isRegistrationModalOpen = true;
      return;
    }

    const isCurrentlyAdded = this.isMatchAddedToFavorites;

    if (isCurrentlyAdded) {
      // Remove from favorites
      this.matchService.removeMatchFromUser(this.matchDetails.id).subscribe({
        next: () => {
          this.isMatchAddedToFavorites = false;
          // Update the matchDetails to reflect the change
          if (this.matchDetails) {
            this.matchDetails.isFavorite = false;
          }
        },
        error: (error) => {
          console.error('Error removing match from user games:', error);
        }
      });
    } else {
      // Add to favorites
      this.matchService.addMatchToUser(this.recordingCode).subscribe({
        next: () => {
          this.isMatchAddedToFavorites = true;
          // Update the matchDetails to reflect the change
          if (this.matchDetails) {
            this.matchDetails.isFavorite = true;
          }
        },
        error: (error) => {
          console.error('Error adding match to user games:', error);
        }
      });
    }
  }

  openRegistrationModal(): void {
    this.isRegistrationModalOpen = true;
  }

  closeRegistrationModal(): void {
    this.isRegistrationModalOpen = false;
  }

  navigateToRegistration(): void {
    this.closeRegistrationModal();
    // Get current URL to redirect back after registration
    const currentUrl = this.router.url;
    this.router.navigate(['/login'], { 
      queryParams: { 
        mode: 'register',
        returnUrl: currentUrl
      } 
    });
  }

  onReprocessVideos(): void {
    if (!this.recordingCode) {
      console.error('No recording code available');
      return;
    }

    // Clear any existing error messages before making the request
    this.errorMessage = '';

    this.mediaLibraryService.invertZoom(this.recordingCode).subscribe({
      next: (response) => {
        console.log('Reprocessing started successfully:', response);
        // Show success message
        alert('Reprocessamento iniciado com sucesso. Os vídeos serão atualizados em breve.');
        // Clear any error messages
        this.errorMessage = '';
        // Reload videos and match details after a short delay to allow backend to start processing
        setTimeout(() => {
          this.loadAllVideos();
          this.loadMatchDetails();
        }, 2000);
      },
      error: (error) => {
        console.error('Error reprocessing videos - full error:', error);
        console.error('Error status:', error?.status);
        console.error('Error message:', error?.message);
        console.error('Error error:', error?.error);
        
        // Check if it's actually a success (200-299) that was caught as error
        const status = error?.status || error?.error?.status;
        if (status && status >= 200 && status < 300) {
          // Status indicates success, treat as success
          console.log('Reprocessing succeeded (status:', status, ')');
          this.errorMessage = '';
          alert('Reprocessamento iniciado. Os vídeos serão atualizados em breve.');
          setTimeout(() => {
            this.loadAllVideos();
            this.loadMatchDetails();
          }, 2000);
        } else {
          // Real error - only show error message for actual failures
          console.error('Actual error occurred:', error);
          alert('Erro ao reprocessar vídeos. Por favor, tenta novamente.');
        }
      }
    });
  }
}


