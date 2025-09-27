import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DownloadFormStateService } from '../../services/download-form-state.service';
import { MatchService } from '../../services/match.service';
import { VideoHighlightsService } from '../../services/video-highlights.service';
import { forkJoin } from 'rxjs';

interface DownloadOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  disabled: boolean;
}

@Component({
  selector: 'app-download-video',
  templateUrl: './download-video.component.html',
  styleUrls: ['./download-video.component.scss']
})
export class DownloadVideoComponent implements OnInit {
  downloadForm: FormGroup;
  isLoading = false;
  isGameValid = false;
  gameId = '';
  voucherCode = '';
  errorMessage = '';

  downloadOptions: DownloadOption[] = [
    {
      id: 'highlights',
      title: 'Highlights',
      description: 'Download only the best moments and goals',
      icon: '⭐',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      disabled: false
    },
    {
      id: 'selected-moments',
      title: 'Selected Moments',
      description: 'Choose specific moments to download',
      icon: '🎯',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      disabled: false
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private downloadFormStateService: DownloadFormStateService,
    private matchService: MatchService,
    private videoHighlightsService: VideoHighlightsService
  ) {
    this.downloadForm = this.fb.group({
      gameId: ['', [Validators.required, Validators.minLength(4)]],
      voucherCode: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit(): void {
    // Check if there's a saved form state to restore
    const savedState = this.downloadFormStateService.getFormState();
    if (savedState) {
      this.gameId = savedState.gameId;
      this.voucherCode = savedState.voucherCode;
      this.isGameValid = savedState.isGameValid;
      this.downloadForm.patchValue({
        gameId: this.gameId,
        voucherCode: this.voucherCode
      });
      // Clear the saved state after restoring
      this.downloadFormStateService.clearFormState();
    } else {
      // Check if game ID is provided in URL
      this.route.params.subscribe(params => {
        if (params['gameId']) {
          this.gameId = params['gameId'];
          this.downloadForm.patchValue({ gameId: this.gameId });
        }
      });
    }
  }

  onSubmit(): void {
    if (this.downloadForm.valid) {
      this.validateGame();
    }
  }

  private validateGame(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const { gameId, voucherCode } = this.downloadForm.value;

    // Simulate backend call - replace with actual API call
    setTimeout(() => {
      // Mock validation - replace with actual backend validation
      if (gameId && voucherCode) {
        this.isGameValid = true;
        this.checkDataAvailability(gameId);
        this.isLoading = false;
        
        // Navigate directly to video library after validation
        this.navigateToVideoLibrary(gameId);
      } else {
        this.errorMessage = 'Invalid game ID or voucher code. Please try again.';
        this.isGameValid = false;
        this.isLoading = false;
      }
    }, 1500);
  }

  private navigateToVideoLibrary(gameId: string): void {
    // Save the current form state before navigating
    const currentState = {
      gameId: this.downloadForm.value.gameId,
      voucherCode: this.downloadForm.value.voucherCode,
      isGameValid: this.isGameValid
    };
    this.downloadFormStateService.saveFormState(currentState);
    
    // Navigate directly to video library
    this.router.navigate(['/video-library', gameId]);
  }

  onDownloadOptionClick(option: DownloadOption): void {
    if (option.disabled) {
      return;
    }

    // Save the current form state before navigating
    const currentState = {
      gameId: this.downloadForm.value.gameId,
      voucherCode: this.downloadForm.value.voucherCode,
      isGameValid: this.isGameValid
    };
    this.downloadFormStateService.saveFormState(currentState);

    // Navigate directly to video library for both options
    const matchCode = this.downloadForm.value.gameId;
    this.router.navigate(['/video-library', matchCode]);
  }

  onBackClick(): void {
    this.router.navigate(['/home']);
  }

  onNewSearch(): void {
    this.isGameValid = false;
    this.downloadForm.reset();
    if (this.gameId) {
      this.downloadForm.patchValue({ gameId: this.gameId });
    }
  }

  private checkDataAvailability(matchCode: string): void {
    // Make both API calls to check for data availability
    const matchEventsCall = this.matchService.getMatchEvents(matchCode);
    const videoHighlightsCall = this.videoHighlightsService.getVideoHighlights(matchCode);

    forkJoin([matchEventsCall, videoHighlightsCall]).subscribe({
      next: ([matchEvents, videoHighlights]) => {
        // Update button states based on data availability
        const highlightsOption = this.downloadOptions.find(option => option.id === 'highlights');
        const selectedMomentsOption = this.downloadOptions.find(option => option.id === 'selected-moments');

        if (highlightsOption) {
          highlightsOption.disabled = !videoHighlights || videoHighlights.length === 0;
        }

        if (selectedMomentsOption) {
          selectedMomentsOption.disabled = !matchEvents || matchEvents.length === 0;
        }
      },
      error: (error) => {
        console.error('Error checking data availability:', error);
        // If there's an error, disable both buttons as a safety measure
        this.downloadOptions.forEach(option => {
          option.disabled = true;
        });
      }
    });
  }
} 