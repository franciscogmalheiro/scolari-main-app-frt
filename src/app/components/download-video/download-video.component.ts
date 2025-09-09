import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DownloadFormStateService } from '../../services/download-form-state.service';

interface DownloadOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
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
      id: 'full-game',
      title: 'Full Game',
      description: 'Download the complete match recording',
      icon: '🎥',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'highlights',
      title: 'Highlights',
      description: 'Download only the best moments and goals',
      icon: '⭐',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 'selected-moments',
      title: 'Selected Moments',
      description: 'Choose specific moments to download',
      icon: '🎯',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private downloadFormStateService: DownloadFormStateService
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
        this.isLoading = false;
      } else {
        this.errorMessage = 'Invalid game ID or voucher code. Please try again.';
        this.isGameValid = false;
        this.isLoading = false;
      }
    }, 1500);
  }

  onDownloadOptionClick(option: DownloadOption): void {
    // Save the current form state before navigating
    const currentState = {
      gameId: this.downloadForm.value.gameId,
      voucherCode: this.downloadForm.value.voucherCode,
      isGameValid: this.isGameValid
    };
    this.downloadFormStateService.saveFormState(currentState);

    if (option.id === 'selected-moments') {
      const matchCode = this.downloadForm.value.gameId;
      this.router.navigate(['/selected-moments', matchCode]);
    } else if (option.id === 'highlights') {
      const matchCode = this.downloadForm.value.gameId;
      this.router.navigate(['/video-highlights', matchCode]);
    } else {
      console.log(`Downloading ${option.title} for game ${this.downloadForm.value.gameId}`);
      // Implement actual download logic here
      alert(`Starting download for ${option.title}...`);
    }
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
} 