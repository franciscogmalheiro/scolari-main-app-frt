import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FieldCameraService, FieldCameraDto, FieldCameraResponseDto } from '../../services/field-camera.service';

@Component({
  selector: 'app-field-camera-management',
  templateUrl: './field-camera-management.component.html',
  styleUrls: ['./field-camera-management.component.scss']
})
export class FieldCameraManagementComponent implements OnInit {
  @Input() fieldId!: number;
  @Input() fieldName!: string;

  cameras: FieldCameraResponseDto[] = [];
  isLoading = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedCamera: FieldCameraResponseDto | null = null;
  errorMessage = '';
  successMessage = '';

  cameraForm: FormGroup;

  constructor(
    private fieldCameraService: FieldCameraService,
    private fb: FormBuilder
  ) {
    this.cameraForm = this.fb.group({
      cameraName: ['', [Validators.required, Validators.maxLength(100)]],
      cameraModel: ['', [Validators.required, Validators.maxLength(100)]],
      ipAddress: ['', [Validators.required, Validators.pattern(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/)]],
      username: ['', [Validators.required, Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.maxLength(255)]],
      port: [8000, [Validators.required, Validators.min(1), Validators.max(65535)]]
    });
  }

  ngOnInit(): void {
    this.loadCameras();
  }

  loadCameras(): void {
    this.isLoading = true;
    this.fieldCameraService.getCamerasByFieldId(this.fieldId).subscribe({
      next: (cameras) => {
        this.cameras = cameras;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading cameras:', error);
        this.errorMessage = 'Failed to load cameras';
        this.isLoading = false;
      }
    });
  }

  openCreateModal(): void {
    this.cameraForm.reset({
      port: 8000
    });
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(camera: FieldCameraResponseDto): void {
    this.selectedCamera = camera;
    this.cameraForm.patchValue({
      cameraName: camera.cameraName,
      cameraModel: camera.cameraModel,
      ipAddress: camera.ipAddress,
      username: camera.username,
      password: camera.password,
      port: camera.port
    });
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openDeleteModal(camera: FieldCameraResponseDto): void {
    this.selectedCamera = camera;
    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedCamera = null;
    this.cameraForm.reset();
  }

  createCamera(): void {
    if (this.cameraForm.valid) {
      const cameraData: FieldCameraDto = {
        ...this.cameraForm.value,
        fieldId: this.fieldId
      };
      this.isLoading = true;

      this.fieldCameraService.createCamera(cameraData).subscribe({
        next: (createdCamera) => {
          this.cameras.push(createdCamera);
          this.successMessage = 'Camera created successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error creating camera:', error);
          this.errorMessage = 'Failed to create camera';
          this.isLoading = false;
        }
      });
    }
  }

  updateCamera(): void {
    if (this.cameraForm.valid && this.selectedCamera) {
      const cameraData: FieldCameraDto = {
        ...this.cameraForm.value,
        fieldId: this.fieldId
      };
      this.isLoading = true;

      this.fieldCameraService.updateCamera(this.selectedCamera.id, cameraData).subscribe({
        next: (updatedCamera) => {
          const index = this.cameras.findIndex(c => c.id === updatedCamera.id);
          if (index !== -1) {
            this.cameras[index] = updatedCamera;
          }
          this.successMessage = 'Camera updated successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error updating camera:', error);
          this.errorMessage = 'Failed to update camera';
          this.isLoading = false;
        }
      });
    }
  }

  deleteCamera(): void {
    if (this.selectedCamera) {
      this.isLoading = true;

      this.fieldCameraService.deleteCamera(this.selectedCamera.id).subscribe({
        next: () => {
          this.cameras = this.cameras.filter(c => c.id !== this.selectedCamera!.id);
          this.successMessage = 'Camera deleted successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error deleting camera:', error);
          this.errorMessage = 'Failed to delete camera';
          this.isLoading = false;
        }
      });
    }
  }
} 