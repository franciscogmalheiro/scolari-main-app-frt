import { Component, OnInit, OnDestroy, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { MatchService, FieldMatchResponseDto } from '../../services/match.service';
import { MediaLibraryService, MediaItemDto } from '../../services/media-library.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-match-history',
  templateUrl: './match-history.component.html',
  styleUrls: ['./match-history.component.scss']
})
export class MatchHistoryComponent implements OnInit, OnDestroy {
  @ViewChildren('itemVideo') itemVideos!: QueryList<ElementRef<HTMLVideoElement>>;

  isLoading = false;
  errorMessage = '';
  currentUser: User | null = null;
  matches: FieldMatchResponseDto[] = [];
  displayedMatches: FieldMatchResponseDto[] = [];
  displayedCount = 6;
  isVipCodeView = false; // Flag to indicate if viewing via vipCode
  
  // Meus golos section
  isLoadingGoals = false;
  goalsError = '';
  myGoals: MediaItemDto[] = [];
  displayedGoals: MediaItemDto[] = [];
  goalsDisplayCount = 6;
  selectedItems: MediaItemDto[] = [];
  currentPreviewItem: MediaItemDto | null = null;
  isVideoPlaying = false;
  private videoBlobCache = new Map<number, string>();
  
  // Share modal state
  isShareModalOpen = false;
  shareItem: MediaItemDto | null = null;
  
  // Confirmation modal state
  isConfirmationModalOpen = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationType: 'match' | 'goal' | null = null;
  confirmationItem: FieldMatchResponseDto | MediaItemDto | null = null;
  
  // Store bound fullscreen change handler for cleanup
  private fullscreenChangeHandler = () => this.handleFullscreenChange();

  constructor(
    private authService: AuthService,
    private matchService: MatchService,
    private mediaLibraryService: MediaLibraryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for vipCode in query params
    const vipCode = this.route.snapshot.queryParams['vipCode'];
    if (vipCode) {
      // Load matches using vipCode
      this.isVipCodeView = true;
      this.loadMatchesByVipCode(vipCode);
    } else {
      // Normal flow - load matches based on user
      this.isVipCodeView = false;
      this.authService.currentUser.subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadMatches(user);
          // Load user goals if role is USER
          if (user.role === 'USER') {
            this.loadUserGoals();
          }
        } else {
          this.errorMessage = 'User not available.';
        }
      });
    }

    // Listen for fullscreen exit events to reset preview state
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
  }

  handleFullscreenChange(): void {
    if (!document.fullscreenElement &&
        !(document as any).webkitFullscreenElement &&
        !(document as any).mozFullScreenElement &&
        !(document as any).msFullscreenElement) {
      this.currentPreviewItem = null;
      this.isVideoPlaying = false;
      // Hide all video elements
      const videos = this.itemVideos?.toArray().map(ref => ref.nativeElement) || [];
      videos.forEach(v => {
        v.classList.add('hidden');
        v.pause();
        v.src = '';
      });
    }
  }

  loadMatches(user: User): void {
    this.isLoading = true;
    
    let matchObservable;
    
    if (user.role === 'USER') {
      // For users with role "USER", call the user endpoint
      matchObservable = this.matchService.getMatchesByUser();
    } else {
      // For other roles (FIELD, ADMIN), call the field endpoint
      if (user.fieldId) {
        matchObservable = this.matchService.getMatchesByField(user.fieldId);
      } else {
        this.errorMessage = 'Field ID not available for current user.';
        this.isLoading = false;
        return;
      }
    }
    
    matchObservable.subscribe({
      next: (data) => {
        this.matches = data || [];
        this.updateDisplayedMatches();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load match history.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadMatchesByVipCode(vipCode: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.matchService.getMatchesByVipCode(vipCode).subscribe({
      next: (data) => {
        this.matches = data || [];
        this.updateDisplayedMatches();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load match history.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  goToDownload(match: FieldMatchResponseDto): void {
    if (match.recordingCode) {
      // If recording code is available, use the recording code route
      this.router.navigate(['/media-library/recording-code', match.recordingCode]);
    } else {
      // If recording code is null, use the video-library route with matchCode
      this.router.navigate(['/video-library', match.matchCode]);
    }
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

  updateDisplayedMatches(): void {
    this.displayedMatches = this.matches.slice(0, this.displayedCount);
  }

  loadMore(): void {
    this.displayedCount += 6;
    this.updateDisplayedMatches();
  }

  hasMoreMatches(): boolean {
    return this.displayedCount < this.matches.length;
  }

  getDurationInMinutes(match: FieldMatchResponseDto): number {
    if (!match.startDateTime || !match.finishDateTime) {
      return 0;
    }
    
    const start = new Date(match.startDateTime);
    const finish = new Date(match.finishDateTime);
    const diffMs = finish.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60));
  }

  // Meus golos methods
  loadUserGoals(): void {
    this.isLoadingGoals = true;
    this.goalsError = '';

    this.mediaLibraryService.getUserVideoSegments().subscribe({
      next: (goals) => {
        this.myGoals = goals || [];
        this.updateDisplayedGoals();
        this.isLoadingGoals = false;
      },
      error: (err) => {
        this.goalsError = 'Failed to load your goals.';
        this.isLoadingGoals = false;
        console.error(err);
      }
    });
  }

  updateDisplayedGoals(): void {
    this.displayedGoals = this.myGoals.slice(0, this.goalsDisplayCount);
  }

  loadMoreGoals(): void {
    this.goalsDisplayCount += 5;
    this.updateDisplayedGoals();
  }

  hasMoreGoals(): boolean {
    return this.goalsDisplayCount < this.myGoals.length;
  }

  isUserRole(): boolean {
    return this.currentUser?.role === 'USER';
  }

  // Media item helper methods (similar to media-library component)
  getItemIcon(item: MediaItemDto): string {
    switch (item.type) {
      case 'photo':
        return '<i class="fas fa-camera"></i>';
      case 'goal-event':
        return '<i class="fas fa-futbol"></i>';
      case 'highlight-event':
        return '<i class="fas fa-hands-clapping"></i>';
      case 'video-highlight':
        return '<i class="fas fa-video"></i>';
      default:
        return '<i class="fas fa-file"></i>';
    }
  }

  getItemDescription(item: MediaItemDto): string {
    // Return formatted date instead of elapsed time
    if (item.creationDateTime) {
      return this.formatGoalDate(item.creationDateTime);
    }
    switch (item.type) {
      case 'video-highlight':
        return 'Resumo';
      case 'photo':
        return 'Foto final';
      default:
        return '';
    }
  }

  formatGoalDate(dateString: string): string {
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

  getItemTeamName(item: MediaItemDto): string {
    return item.teamName || '';
  }

  getMatchResult(item: MediaItemDto): string {
    if (item.teamAName && item.finalResult && item.teamBName) {
      return `${item.type === 'goal-event' ? '(' + item.result + ')' : ''} ${item.teamAName} ${item.finalResult} ${item.teamBName}`;
    }
    return '';
  }

  isItemGoal(item: MediaItemDto): boolean {
    return item.type === 'goal-event' && !!item.result;
  }

  isItemGoalOrHighlight(item: MediaItemDto): boolean {
    return item.type === 'goal-event' || item.type === 'highlight-event';
  }

  getItemResult(item: MediaItemDto): string {
    return item.result || '';
  }

  getItemUrl(item: MediaItemDto): string {
    return item.presignedUrl || '';
  }

  isItemProcessing(item: MediaItemDto): boolean {
    return item.processingStatus === 'PROCESSING' || item.processingStatus === 'RETRYING' || item.processingStatus === 'WAITING_FOR_SEGMENTS' || item.processingStatus === 'PENDING_EXTRACTION';
  }

  isItemProcessingFailed(item: MediaItemDto): boolean {
    return item.processingStatus === 'PROCESSING_FAILED';
  }

  isItemDisabled(item: MediaItemDto): boolean {
    return !item.presignedUrl || this.isItemProcessing(item) || this.isItemProcessingFailed(item);
  }

  getItemId(item: MediaItemDto): number {
    return item.id;
  }

  isItemPhoto(item: MediaItemDto): boolean {
    return item.type === 'photo';
  }

  isItemSelected(item: MediaItemDto): boolean {
    return this.selectedItems.some(selected => selected.id === item.id);
  }

  onSelectItem(item: MediaItemDto): void {
    const isSelected = this.selectedItems.some(selected => selected.id === item.id);
    this.selectedItems = isSelected
      ? this.selectedItems.filter(selected => selected.id !== item.id)
      : [...this.selectedItems, item];
  }

  onItemClick(item: MediaItemDto, $event: MouseEvent): void {
    $event.stopPropagation();
    if (this.isItemPhoto(item)) {
      this.openPhoto(item);
      return;
    }
    // For videos, use onPreviewItem
    this.onPreviewItem(item);
  }

  onPreviewItem(item: MediaItemDto): void {
    if (!item.presignedUrl) {
      return;
    }
    this.isVideoPlaying = true;

    setTimeout(() => {
      const videos = this.itemVideos?.toArray().map(ref => ref.nativeElement) || [];
      const target = videos.find(v => v.getAttribute('data-item-id') === item.id.toString());
      if (target) {
        target.classList.remove('hidden');
        if (this.videoBlobCache.has(item.id)) {
          target.src = this.videoBlobCache.get(item.id)!;
          target.load();
        } else if (item.presignedUrl) {
          target.src = item.presignedUrl;
          target.load();
        }

        const playAndFullscreen = () => {
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
            target.play().catch(console.error);
          }
        };

        if (target.readyState >= 2) {
          playAndFullscreen();
        } else {
          const onCanPlay = () => {
            playAndFullscreen();
            target.removeEventListener('canplay', onCanPlay);
          };
          target.addEventListener('canplay', onCanPlay);
        }
      }
    }, 0);
  }

  onVideoEnded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    video.classList.add('hidden');
    this.currentPreviewItem = null;
    this.isVideoPlaying = false;
  }

  onVideoError(event: Event): void {
    console.error('Video error:', event);
  }

  onVideoLoaded(): void {
    // Video loaded successfully
  }

  onVideoPlay(event: Event): void {
    // Video started playing
  }

  getResumoThumbnailUrl(item: MediaItemDto): string {
    // For goal events, always use golo thumbnail
    if (item.type === 'goal-event') {
      return 'assets/golo-thumbnail.png';
    }
    // For highlight events, use highlight thumbnail
    if (item.type === 'highlight-event') {
      return 'assets/highlight-thumbnail.png';
    }
    // For video highlights, use resumo thumbnail
    if (item.type === 'video-highlight') {
      return 'assets/resumo-thumnail.png';
    }
    // For photos, use the presigned URL
    if (item.type === 'photo') {
      return item.presignedUrl || '';
    }
    // Fallback to resumo thumbnail
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

  async onDownloadItem(item: MediaItemDto): Promise<void> {
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

  openShareModal(item?: MediaItemDto): void {
    this.shareItem = item || null;
    this.isShareModalOpen = true;
  }

  closeShareModal(): void {
    this.isShareModalOpen = false;
    this.shareItem = null;
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

  private buildShareUrl(item: MediaItemDto): string {
    const videoUrl = item.presignedUrl || '';
    if (!videoUrl) {
      return '';
    }
    
    const base = environment.publicBaseUrl && environment.publicBaseUrl.trim().length > 0
      ? environment.publicBaseUrl.replace(/\/$/, '')
      : window.location.origin;
    
    // Extract recordingCode and segmentName from presignedUrl
    const recordingCode = this.extractRecordingCode(videoUrl);
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
    const url = target ? this.buildShareUrl(target) : '';
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
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
    const url = target ? this.buildShareUrl(target) : '';
    const shareText = target 
      ? encodeURI('Clica neste link para veres um dos vídeos do jogo: ')
      : encodeURI('Revê aqui os melhores momentos do teu jogo: ');
    const waUrl = `https://wa.me/?text=${shareText}${encodeURIComponent(url)}`;
    window.open(waUrl, '_blank');
  }

  openPhoto(photo: MediaItemDto): void {
    if (!photo.presignedUrl) {
      return;
    }

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
      if (container.parentNode) {
        document.body.removeChild(container);
      }
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
  }

  // Delete functionality
  onRemoveMatch(match: FieldMatchResponseDto, event: Event): void {
    event.stopPropagation();
    this.confirmationType = 'match';
    this.confirmationItem = match;
    this.confirmationTitle = 'REMOVER JOGO';
    this.confirmationMessage = `Tens a certeza que desejas remover o jogo "${match.teamAName} ${match.finalResult} ${match.teamBName}" dos teus jogos?`;
    this.isConfirmationModalOpen = true;
  }

  onRemoveGoal(goal: MediaItemDto, event: Event): void {
    event.stopPropagation();
    this.confirmationType = 'goal';
    this.confirmationItem = goal;
    this.confirmationTitle = 'Remover Golo';
    this.confirmationMessage = 'Tem a certeza que deseja remover este golo dos seus golos?';
    this.isConfirmationModalOpen = true;
  }

  onConfirmDelete(): void {
    if (!this.confirmationType || !this.confirmationItem) {
      return;
    }

    if (this.confirmationType === 'match') {
      const match = this.confirmationItem as FieldMatchResponseDto;
      this.matchService.removeMatchFromUser(match.id).subscribe({
        next: () => {
          // Remove from local array
          this.matches = this.matches.filter(m => m.id !== match.id);
          this.updateDisplayedMatches();
          this.closeConfirmationModal();
        },
        error: (err) => {
          console.error('Error removing match from user:', err);
          this.closeConfirmationModal();
        }
      });
    } else if (this.confirmationType === 'goal') {
      const goal = this.confirmationItem as MediaItemDto;
      if (!goal.id) {
        this.closeConfirmationModal();
        return;
      }
      this.mediaLibraryService.removeMatchEventFromUser(goal.id).subscribe({
        next: () => {
          // Remove from local array
          this.myGoals = this.myGoals.filter(g => g.id !== goal.id);
          this.updateDisplayedGoals();
          this.closeConfirmationModal();
        },
        error: (err) => {
          console.error('Error removing goal from user:', err);
          this.closeConfirmationModal();
        }
      });
    }
  }

  onCancelDelete(): void {
    this.closeConfirmationModal();
  }

  closeConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
    this.confirmationType = null;
    this.confirmationItem = null;
    this.confirmationTitle = '';
    this.confirmationMessage = '';
  }
}
