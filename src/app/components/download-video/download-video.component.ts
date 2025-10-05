import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DownloadFormStateService } from '../../services/download-form-state.service';
import { RecordingCodeService } from '../../services/recording-code.service';

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
  recordingCode = '';
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
    private recordingCodeService: RecordingCodeService
  ) {
    this.downloadForm = this.fb.group({
      recordingCode: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit(): void {
    // Check if there's a saved form state to restore
    const savedState = this.downloadFormStateService.getFormState();
    if (savedState) {
      this.recordingCode = savedState.recordingCode;
      this.isGameValid = savedState.isGameValid;
      this.downloadForm.patchValue({
        recordingCode: this.recordingCode
      });
      // Clear the saved state after restoring
      this.downloadFormStateService.clearFormState();
    } else {
      // Reset form to initial state when coming from home page or fresh load
      this.resetForm();
    }
    
    // Check if recording code is provided in URL
    this.route.params.subscribe(params => {
      if (params['recordingCode']) {
        this.recordingCode = params['recordingCode'];
        this.downloadForm.patchValue({ recordingCode: this.recordingCode });
      }
    });
  }

  onSubmit(): void {
    if (this.downloadForm.valid) {
      this.validateRecordingCode();
    }
  }

  private validateRecordingCode(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const { recordingCode } = this.downloadForm.value;

    this.recordingCodeService.validateRecordingCode(recordingCode).subscribe({
      next: (recordingCodeData) => {
        this.isGameValid = true;
        this.isLoading = false;
        
        // Navigate directly to video library after validation
        this.navigateToVideoLibrary(recordingCode);
      },
      error: (error) => {
        console.error('Error validating recording code:', error);
        this.errorMessage = 'Código de gravação inválido. Por favor, tenta novamente.';
        this.isGameValid = false;
        this.isLoading = false;
      }
    });
  }

  private navigateToVideoLibrary(recordingCode: string): void {
    // Save the current form state before navigating
    const currentState = {
      recordingCode: this.downloadForm.value.recordingCode,
      isGameValid: this.isGameValid
    };
    this.downloadFormStateService.saveFormState(currentState);
    
    // Navigate directly to video library using recording code
    this.router.navigate(['/media-library/recording-code', recordingCode]);
  }

  onDownloadOptionClick(option: DownloadOption): void {
    if (option.disabled) {
      return;
    }

    // Save the current form state before navigating
    const currentState = {
      recordingCode: this.downloadForm.value.recordingCode,
      isGameValid: this.isGameValid
    };
    this.downloadFormStateService.saveFormState(currentState);

    // Navigate directly to video library for both options
    const recordingCode = this.downloadForm.value.recordingCode;
    this.router.navigate(['/media-library/recording-code', recordingCode]);
  }

  onBackClick(): void {
    this.router.navigate(['/home']);
  }

  onNewSearch(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.isGameValid = false;
    this.isLoading = false;
    this.errorMessage = '';
    this.recordingCode = '';
    this.downloadForm.reset();
  }

} 