import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FieldCameraService, FieldCameraResponseDto } from '../../services/field-camera.service';

@Component({
  selector: 'app-record-instructions',
  templateUrl: './record-instructions.component.html',
  styleUrls: ['./record-instructions.component.scss']
})
export class RecordInstructionsComponent implements OnInit {
  // Store the query parameters to preserve them
  private queryParams: any = {};
  
  // Camera health check states
  isCheckingCamera = false;
  cameraHealthCheckPassed = false;
  cameraHealthCheckFailed = false;
  errorMessage = '';
  
  // Camera data
  availableCameras: FieldCameraResponseDto[] = [];
  selectedCamera: FieldCameraResponseDto | null = null;
  isLoadingCameras = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fieldCameraService: FieldCameraService
  ) {}

  ngOnInit(): void {
    // Capture all query parameters when component loads
    this.route.queryParams.subscribe(params => {
      this.queryParams = { ...params };
      console.log('Record instructions received params:', this.queryParams);
      
      // If we have a cameraId, use it directly
      if (this.queryParams.cameraId) {
        this.performCameraHealthCheck();
      }
      // If we have a fieldId, fetch cameras for that field
      else if (this.queryParams.fieldId) {
        this.loadCamerasForField();
      }
      // If neither, show error
      else {
        this.cameraHealthCheckFailed = true;
        this.errorMessage = 'No field or camera information provided';
      }
    });
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
        this.errorMessage = 'Camera connection failed. Check your camera setup and try again.';
        console.error('Camera health check failed:', error);
      }
    });
  }

  onNextClick(): void {
    // Only allow navigation if camera health check passed
    if (this.cameraHealthCheckPassed) {
      // Add cameraId to query params if we have a selected camera
      const navigationParams = { ...this.queryParams };
      if (this.selectedCamera && !navigationParams.cameraId) {
        navigationParams.cameraId = this.selectedCamera.id;
      }
      
      // Preserve all query parameters when navigating to score game
      this.router.navigate(['/score-game'], { queryParams: navigationParams });
    }
  }

  onBackClick(): void {
    // Navigate back to home page
    this.router.navigate(['/home']);
  }

  retryCameraCheck(): void {
    if (this.queryParams.cameraId) {
      this.performCameraHealthCheck();
    } else if (this.queryParams.fieldId) {
      this.loadCamerasForField();
    }
  }
} 