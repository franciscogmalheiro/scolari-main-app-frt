import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FieldService, FieldDto, FieldResponseDto } from '../../services/field.service';
import { SportService, Sport } from '../../services/sport.service';

@Component({
  selector: 'app-field-management',
  templateUrl: './field-management.component.html',
  styleUrls: ['./field-management.component.scss']
})
export class FieldManagementComponent implements OnInit {
  fields: FieldResponseDto[] = [];
  sports: Sport[] = [];
  isLoading = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedField: FieldResponseDto | null = null;
  errorMessage = '';
  successMessage = '';

  fieldForm: FormGroup;

  constructor(
    private fieldService: FieldService,
    private sportService: SportService,
    private fb: FormBuilder
  ) {
    this.fieldForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      sportId: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadSports();
    this.loadFields();
  }

  loadSports(): void {
    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
      error: (error) => {
        console.error('Error loading sports:', error);
        this.errorMessage = 'Failed to load sports';
      }
    });
  }

  loadFields(): void {
    this.isLoading = true;
    this.fieldService.getAllFields().subscribe({
      next: (fields) => {
        this.fields = fields;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        this.errorMessage = 'Failed to load fields';
        this.isLoading = false;
      }
    });
  }

  openCreateModal(): void {
    this.fieldForm.reset();
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(field: FieldResponseDto): void {
    this.selectedField = field;
    this.fieldForm.patchValue({
      name: field.name,
      sportId: field.sportId
    });
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openDeleteModal(field: FieldResponseDto): void {
    this.selectedField = field;
    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedField = null;
    this.fieldForm.reset();
  }

  createField(): void {
    if (this.fieldForm.valid) {
      const fieldData: FieldDto = this.fieldForm.value;
      this.isLoading = true;

      this.fieldService.createField(fieldData).subscribe({
        next: (createdField) => {
          this.fields.push(createdField);
          this.successMessage = 'Field created successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error creating field:', error);
          this.errorMessage = 'Failed to create field';
          this.isLoading = false;
        }
      });
    }
  }

  updateField(): void {
    if (this.fieldForm.valid && this.selectedField) {
      const fieldData: FieldDto = this.fieldForm.value;
      this.isLoading = true;

      this.fieldService.updateField(this.selectedField.id, fieldData).subscribe({
        next: (updatedField) => {
          const index = this.fields.findIndex(f => f.id === updatedField.id);
          if (index !== -1) {
            this.fields[index] = updatedField;
          }
          this.successMessage = 'Field updated successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error updating field:', error);
          this.errorMessage = 'Failed to update field';
          this.isLoading = false;
        }
      });
    }
  }

  deleteField(): void {
    if (this.selectedField) {
      this.isLoading = true;

      this.fieldService.deleteField(this.selectedField.id).subscribe({
        next: () => {
          this.fields = this.fields.filter(f => f.id !== this.selectedField!.id);
          this.successMessage = 'Field deleted successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error deleting field:', error);
          this.errorMessage = 'Failed to delete field';
          this.isLoading = false;
        }
      });
    }
  }

  getSportName(sportId: number): string {
    const sport = this.sports.find(s => s.id === sportId);
    return sport ? sport.name : 'Unknown Sport';
  }
} 