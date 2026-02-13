import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FieldCameraService, FieldCameraResponseDto } from '../../services/field-camera.service';
import { RecordingCodeService, RecordingCodeDto } from '../../services/recording-code.service';
import { TrackingService } from '../../services/tracking.service';

@Component({
  selector: 'app-record-instructions',
  templateUrl: './record-instructions.component.html',
  styleUrls: ['./record-instructions.component.scss']
})
export class RecordInstructionsComponent implements OnInit {
  // Store the query parameters to preserve them
  private queryParams: any = {};
  
  // Recording code form
  recordingCodeForm: FormGroup;
  
  // Recording code validation states
  isValidatingCode = false;
  codeValidationFailed = false;
  codeValidationError = '';
  validatedRecordingCode: RecordingCodeDto | null = null;
  
  // Camera health check states
  isCheckingCamera = false;
  cameraHealthCheckPassed = false;
  cameraHealthCheckFailed = false;
  errorMessage = '';
  
  // Camera data
  availableCameras: FieldCameraResponseDto[] = [];
  selectedCamera: FieldCameraResponseDto | null = null;
  isLoadingCameras = false;

  // Free recording code
  freeRecordingCode: RecordingCodeDto | null = null;
  isLoadingFreeRecordingCode = false;
  hasClaimedFreeRecordingCode = false;

  // Tracking
  private hasTrackedQrScan = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fieldCameraService: FieldCameraService,
    private recordingCodeService: RecordingCodeService,
    private formBuilder: FormBuilder,
    private trackingService: TrackingService
  ) {
    this.recordingCodeForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    // Capture all query parameters when component loads
    this.route.queryParams.subscribe(params => {
      this.queryParams = { ...params };
      console.log('Record instructions received params:', this.queryParams);
      
      // Check if this navigation came from a QR code scan
      if (params['fromQR'] === 'true' && !this.hasTrackedQrScan) {
        this.registerQrCodeScan(params);
      }

      // Try to obtain a free recording code for the user (after params are available)
      this.requestFreeRecordingCode();
    });
  }

  /**
   * Register a QR code scan event with the backend
   */
  private registerQrCodeScan(params: any): void {
    // Mark as tracked to avoid duplicate registrations
    this.hasTrackedQrScan = true;

    const eventData = {
      actionName: 'FLYER_QR_CODE_SCAN',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent || undefined,
      metadata: {
        sportId: params['sportId'] ? Number(params['sportId']) : undefined,
        mode: params['mode'] || undefined
      }
    };

    this.trackingService.trackEvent(eventData).subscribe({
      next: (response) => {
        console.log('QR code scan tracked successfully:', response);
      },
      error: (error) => {
        // Log error but don't block user experience
        console.error('Failed to track QR code scan:', error);
      }
    });
  }

  /**
   * Request a free recording code from the backend.
   * If successful, we will later allow the user to apply it via a button.
   * If it fails (e.g. 500), we simply don't show the button.
   */
  private requestFreeRecordingCode(): void {
    const fieldId = this.queryParams.fieldId;

    // If we don't have a fieldId (e.g. no context), we cannot request a free code
    if (!fieldId) {
      console.log('No fieldId available, skipping free recording code request');
      return;
    }

    console.log('Requesting free recording code for fieldId:', fieldId);
    this.isLoadingFreeRecordingCode = true;
    const timestamp = new Date().toISOString();

    this.recordingCodeService.getFreeRecordingCode(fieldId, timestamp).subscribe({
      next: (recordingCode) => {
        this.isLoadingFreeRecordingCode = false;
        this.freeRecordingCode = recordingCode;
        console.log('Free recording code obtained:', recordingCode);
      },
      error: (error) => {
        this.isLoadingFreeRecordingCode = false;
        this.freeRecordingCode = null;
        console.error('Failed to obtain free recording code:', error);
      }
    });
  }

  continueWithoutRecording(): void {
    // Navigate directly to score game without recording
    const navigationParams = { ...this.queryParams };
    navigationParams.recordingMode = 'false';
    this.router.navigate(['/score-game'], { queryParams: navigationParams });
  }

  validateRecordingCode(): void {
    if (this.recordingCodeForm.invalid) {
      return;
    }

    const code = this.recordingCodeForm.get('code')?.value;
    if (!code) {
      return;
    }

    this.isValidatingCode = true;
    this.codeValidationFailed = false;
    this.codeValidationError = '';

    this.recordingCodeService.validateRecordingCode(code).subscribe({
      next: (recordingCode) => {
        this.isValidatingCode = false;
        
        if (recordingCode.isUsed) {
          // Code exists but is already used - treat as error
          this.codeValidationFailed = true;
          this.codeValidationError = 'Este código de gravação já foi utilizado.';
          this.validatedRecordingCode = null;
        } else {
          // Code is valid and unused, proceed with camera health check
          this.validatedRecordingCode = recordingCode;
          this.queryParams.fieldId = recordingCode.fieldId;
          this.loadCamerasForField();
        }
      },
      error: (error) => {
        this.isValidatingCode = false;
        this.codeValidationFailed = true;
        this.codeValidationError = 'Código de gravação inválido ou não encontrado.';
        this.validatedRecordingCode = null;
        console.error('Recording code validation failed:', error);
      }
    });
  }

  /**
   * Apply the previously fetched free recording code into the input field
   * and disable the "free code" button.
   */
  applyFreeRecordingCode(): void {
    if (!this.freeRecordingCode) {
      return;
    }

    this.recordingCodeForm.get('code')?.setValue(this.freeRecordingCode.code);
    this.hasClaimedFreeRecordingCode = true;
  }

  private resetValidationStates(): void {
    this.isValidatingCode = false;
    this.codeValidationFailed = false;
    this.codeValidationError = '';
    this.validatedRecordingCode = null;
    this.cameraHealthCheckPassed = false;
    this.cameraHealthCheckFailed = false;
    this.errorMessage = '';
  }

  loadCamerasForField(): void {
    const fieldId = this.queryParams.fieldId;
    if (!fieldId) {
      this.cameraHealthCheckFailed = true;
      this.errorMessage = 'Field ID not provided';
      return;
    }

    this.isLoadingCameras = true;
    this.cameraHealthCheckFailed = false;
    this.errorMessage = '';

    this.fieldCameraService.getCamerasByFieldId(fieldId).subscribe({
      next: (cameras) => {
        this.isLoadingCameras = false;
        this.availableCameras = cameras;
        
        if (cameras.length === 0) {
          this.cameraHealthCheckFailed = true;
          this.errorMessage = 'No cameras found for this field. Please configure cameras first.';
        } else {
          // Select the first camera and perform health check
          this.selectedCamera = cameras[0];
          this.performCameraHealthCheck();
        }
      },
      error: (error) => {
        this.isLoadingCameras = false;
        this.cameraHealthCheckFailed = true;
        this.errorMessage = 'Failed to load cameras for this field. Please try again.';
        console.error('Failed to load cameras:', error);
      }
    });
  }

  performCameraHealthCheck(): void {
    let cameraId: number;
    
    // Use cameraId from query params if available, otherwise use selected camera
    if (this.queryParams.cameraId) {
      cameraId = this.queryParams.cameraId;
    } else if (this.selectedCamera) {
      cameraId = this.selectedCamera.id;
    } else {
      this.cameraHealthCheckFailed = true;
      this.errorMessage = 'No camera available for health check';
      return;
    }

    this.isCheckingCamera = true;
    this.cameraHealthCheckPassed = false;
    this.cameraHealthCheckFailed = false;
    this.errorMessage = '';

    this.fieldCameraService.checkCameraHealth(cameraId).subscribe({
      next: (response) => {
        this.isCheckingCamera = false;
        this.cameraHealthCheckPassed = true;
        console.log('Camera health check passed:', response);
      },
      error: (error) => {
        this.isCheckingCamera = false;
        this.cameraHealthCheckFailed = true;
        this.errorMessage = 'A conecção com a câmera falhou. Tenta mais tarde.';
        console.error('Camera health check failed:', error);
      }
    });
  }

  onNextClick(): void {
    // Check if we can proceed
    if (this.cameraHealthCheckPassed) {
      const navigationParams = { ...this.queryParams };
      
      // Determine recording mode based on whether we have a validated code
      if (this.validatedRecordingCode) {
        // Recording mode with validated code
        navigationParams.recordingMode = 'true';
        
        // Add cameraId to query params if we have a selected camera
        if (this.selectedCamera && !navigationParams.cameraId) {
          navigationParams.cameraId = this.selectedCamera.id;
        }
        
        // Use fieldId from validated recording code
        navigationParams.fieldId = this.validatedRecordingCode.fieldId;
        
        // Add recording code to mark it as used
        navigationParams.recordingCode = this.validatedRecordingCode.code;
      } else {
        // Non-recording mode
        navigationParams.recordingMode = 'false';
      }
      
      this.router.navigate(['/score-game'], { queryParams: navigationParams });
    }
  }

  onBackClick(): void {
    // Navigate back to home page
    this.router.navigate(['/home']);
  }

  retryCameraCheck(): void {
    if (this.validatedRecordingCode) {
      this.loadCamerasForField();
    } else if (this.queryParams.cameraId) {
      this.performCameraHealthCheck();
    } else if (this.queryParams.fieldId) {
      this.loadCamerasForField();
    }
  }

  canProceed(): boolean {
    // Can proceed if camera health check passed (only for recording mode)
    return this.cameraHealthCheckPassed && !this.isCheckingCamera;
  }
} 