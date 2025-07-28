import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClubService, ClubDto, ClubResponseDto } from '../../services/club.service';
import { ClubFieldService, ClubFieldDto, ClubFieldResponseDto } from '../../services/club-field.service';
import { SportService, Sport } from '../../services/sport.service';

@Component({
  selector: 'app-club-management',
  templateUrl: './club-management.component.html',
  styleUrls: ['./club-management.component.scss']
})
export class ClubManagementComponent implements OnInit {
  clubs: ClubResponseDto[] = [];
  sports: Sport[] = [];
  isLoading = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedClub: ClubResponseDto | null = null;
  errorMessage = '';
  successMessage = '';

  // Club fields management
  expandedClubId: number | null = null;
  clubFields: { [clubId: number]: ClubFieldResponseDto[] } = {};
  loadingFields: { [clubId: number]: boolean } = {};
  showFieldCreateModal = false;
  showFieldEditModal = false;
  showFieldDeleteModal = false;
  selectedField: ClubFieldResponseDto | null = null;
  selectedClubForField: ClubResponseDto | null = null;

  // Camera management
  showCameraManagement = false;
  selectedFieldForCamera: ClubFieldResponseDto | null = null;
  selectedClubForCamera: ClubResponseDto | null = null;

  clubForm: FormGroup;
  fieldForm: FormGroup;

  currentYear = new Date().getFullYear();

  constructor(
    private clubService: ClubService,
    private clubFieldService: ClubFieldService,
    private sportService: SportService,
    private fb: FormBuilder
  ) {
    this.clubForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      foundedYear: ['', [Validators.min(1800), Validators.max(this.currentYear)]],
      address: ['', [Validators.minLength(5)]],
      city: ['', [Validators.minLength(2)]],
      country: ['', [Validators.minLength(2)]]
    });

    this.fieldForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      sportIds: [[], [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    this.loadSports();
    this.loadClubs();
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

  loadClubs(): void {
    this.isLoading = true;
    this.clubService.getAllClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading clubs:', error);
        this.errorMessage = 'Failed to load clubs';
        this.isLoading = false;
      }
    });
  }

  openCreateModal(): void {
    this.clubForm.reset();
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(club: ClubResponseDto): void {
    this.selectedClub = club;
    this.clubForm.patchValue({
      name: club.name,
      description: club.description || '',
      foundedYear: club.foundedYear || '',
      address: club.address || '',
      city: club.city || '',
      country: club.country || ''
    });
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openDeleteModal(club: ClubResponseDto): void {
    this.selectedClub = club;
    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedClub = null;
    this.clubForm.reset();
  }

  createClub(): void {
    if (this.clubForm.valid) {
      const clubData: ClubDto = this.clubForm.value;
      // Remove empty optional fields
      Object.keys(clubData).forEach(key => {
        if (clubData[key as keyof ClubDto] === '' || clubData[key as keyof ClubDto] === null) {
          delete clubData[key as keyof ClubDto];
        }
      });
      
      this.isLoading = true;

      this.clubService.createClub(clubData).subscribe({
        next: (createdClub) => {
          this.clubs.push(createdClub);
          this.successMessage = 'Club created successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error creating club:', error);
          this.errorMessage = 'Failed to create club';
          this.isLoading = false;
        }
      });
    }
  }

  updateClub(): void {
    if (this.clubForm.valid && this.selectedClub) {
      const clubData: ClubDto = this.clubForm.value;
      // Remove empty optional fields
      Object.keys(clubData).forEach(key => {
        if (clubData[key as keyof ClubDto] === '' || clubData[key as keyof ClubDto] === null) {
          delete clubData[key as keyof ClubDto];
        }
      });
      
      this.isLoading = true;

      this.clubService.updateClub(this.selectedClub.id, clubData).subscribe({
        next: (updatedClub) => {
          const index = this.clubs.findIndex(c => c.id === updatedClub.id);
          if (index !== -1) {
            this.clubs[index] = updatedClub;
          }
          this.successMessage = 'Club updated successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error updating club:', error);
          this.errorMessage = 'Failed to update club';
          this.isLoading = false;
        }
      });
    }
  }

  deleteClub(): void {
    if (this.selectedClub) {
      this.isLoading = true;

      this.clubService.deleteClub(this.selectedClub.id).subscribe({
        next: () => {
          this.clubs = this.clubs.filter(c => c.id !== this.selectedClub!.id);
          this.successMessage = 'Club deleted successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error deleting club:', error);
          this.errorMessage = 'Failed to delete club';
          this.isLoading = false;
        }
      });
    }
  }

  getFoundedYearDisplay(foundedYear?: number): string {
    return foundedYear ? foundedYear.toString() : 'N/A';
  }

  getLocationDisplay(club: ClubResponseDto): string {
    const parts = [];
    if (club.city) parts.push(club.city);
    if (club.country) parts.push(club.country);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }

  // Club fields management methods
  toggleClubExpansion(club: ClubResponseDto): void {
    if (this.expandedClubId === club.id) {
      this.expandedClubId = null;
    } else {
      this.expandedClubId = club.id;
      if (!this.clubFields[club.id]) {
        this.loadClubFields(club.id);
      }
    }
  }

  isClubExpanded(clubId: number): boolean {
    return this.expandedClubId === clubId;
  }

  loadClubFields(clubId: number): void {
    this.loadingFields[clubId] = true;
    this.clubFieldService.getClubFields(clubId).subscribe({
      next: (fields) => {
        this.clubFields[clubId] = fields;
        this.loadingFields[clubId] = false;
      },
      error: (error) => {
        console.error('Error loading club fields:', error);
        this.errorMessage = 'Failed to load club fields';
        this.loadingFields[clubId] = false;
      }
    });
  }

  openFieldCreateModal(club: ClubResponseDto): void {
    this.selectedClubForField = club;
    this.fieldForm.reset();
    this.showFieldCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openFieldEditModal(field: ClubFieldResponseDto, club: ClubResponseDto): void {
    this.selectedField = field;
    this.selectedClubForField = club;
    this.fieldForm.patchValue({
      name: field.fieldName,
      sportIds: field.fieldSports.map(sport => sport.sportId)
    });
    this.showFieldEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openFieldDeleteModal(field: ClubFieldResponseDto, club: ClubResponseDto): void {
    this.selectedField = field;
    this.selectedClubForField = club;
    this.showFieldDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeFieldModals(): void {
    this.showFieldCreateModal = false;
    this.showFieldEditModal = false;
    this.showFieldDeleteModal = false;
    this.selectedField = null;
    this.selectedClubForField = null;
    this.fieldForm.reset();
  }

  createField(): void {
    if (this.fieldForm.valid && this.selectedClubForField) {
      const fieldData: ClubFieldDto = this.fieldForm.value;
      this.isLoading = true;

      this.clubFieldService.createClubField(this.selectedClubForField.id, fieldData).subscribe({
        next: (createdField) => {
          // Refresh the fields list for this club
          this.loadClubFields(this.selectedClubForField!.id);
          this.successMessage = 'Field created successfully!';
          this.closeFieldModals();
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
    if (this.fieldForm.valid && this.selectedField && this.selectedClubForField) {
      const fieldData: ClubFieldDto = this.fieldForm.value;
      this.isLoading = true;

      this.clubFieldService.updateClubField(this.selectedClubForField.id, this.selectedField.fieldId, fieldData).subscribe({
        next: (updatedField) => {
          // Refresh the fields list for this club
          this.loadClubFields(this.selectedClubForField!.id);
          this.successMessage = 'Field updated successfully!';
          this.closeFieldModals();
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
    if (this.selectedField && this.selectedClubForField) {
      this.isLoading = true;

      this.clubFieldService.deleteClubField(this.selectedClubForField.id, this.selectedField.fieldId).subscribe({
        next: () => {
          // Refresh the fields list for this club
          this.loadClubFields(this.selectedClubForField!.id);
          this.successMessage = 'Field deleted successfully!';
          this.closeFieldModals();
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

  getSportsDisplay(fieldSports: Array<{id: number, fieldId: number, fieldName: string, sportId: number, sportCode: string, sportName: string}>): string {
    return fieldSports.map(sport => sport.sportName).join(', ');
  }

  // Camera management methods
  openCameraManagement(field: ClubFieldResponseDto, club: ClubResponseDto): void {
    this.selectedFieldForCamera = field;
    this.selectedClubForCamera = club;
    this.showCameraManagement = true;
  }

  closeCameraManagement(): void {
    this.showCameraManagement = false;
    this.selectedFieldForCamera = null;
    this.selectedClubForCamera = null;
  }
} 