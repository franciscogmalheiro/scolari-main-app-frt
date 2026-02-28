import { Component, OnInit } from '@angular/core';
import { MultiUseRecordingCodeService, MultiUseRecordingCodeResponseDto } from '../../services/multi-use-recording-code.service';
import { FieldService, FieldResponseDto } from '../../services/field.service';

@Component({
  selector: 'app-multi-use-recording-code-management',
  templateUrl: './multi-use-recording-code-management.component.html',
  styleUrls: ['./multi-use-recording-code-management.component.scss']
})
export class MultiUseRecordingCodeManagementComponent implements OnInit {
  fields: FieldResponseDto[] = [];
  allCodes: MultiUseRecordingCodeResponseDto[] = [];
  filteredCodes: MultiUseRecordingCodeResponseDto[] = [];

  pageSize = 10;
  currentPage = 1;

  selectedFieldId: number | null = null;
  hasSearched = false;

  createdDateFrom: string | null = null;
  createdDateTo: string | null = null;
  isPrintedFilter: 'all' | 'printed' | 'notPrinted' = 'all';

  isLoadingFields = false;
  isLoadingCodes = false;
  markingAsPrintedId: number | null = null;
  showDeleteModal = false;
  selectedCodeForDelete: MultiUseRecordingCodeResponseDto | null = null;
  isDeleting = false;

  errorMessage = '';
  successMessage = '';

  constructor(
    private multiUseRecordingCodeService: MultiUseRecordingCodeService,
    private fieldService: FieldService
  ) {}

  ngOnInit(): void {
    this.loadFields();
  }

  loadFields(): void {
    this.isLoadingFields = true;
    this.fieldService.getAllFields().subscribe({
      next: (fields) => {
        this.fields = fields;
        this.isLoadingFields = false;
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        this.errorMessage = 'Failed to load fields';
        this.isLoadingFields = false;
      }
    });
  }

  onFieldChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const fieldIdString = target?.value ?? '';

    if (!fieldIdString) {
      this.selectedFieldId = null;
      this.allCodes = [];
      this.filteredCodes = [];
      this.hasSearched = false;
      return;
    }

    const fieldId = Number(fieldIdString);
    this.selectedFieldId = isNaN(fieldId) ? null : fieldId;

    this.allCodes = [];
    this.filteredCodes = [];
    this.hasSearched = false;
  }

  search(): void {
    this.errorMessage = '';

    if (!this.selectedFieldId) {
      this.allCodes = [];
      this.filteredCodes = [];
      this.hasSearched = false;
      this.errorMessage = 'Please select a field to search.';
      return;
    }

    this.hasSearched = true;
    this.isLoadingCodes = true;
    this.multiUseRecordingCodeService.getByField(this.selectedFieldId).subscribe({
      next: (codes) => {
        this.allCodes = codes;
        this.applyFilters();
        this.isLoadingCodes = false;
      },
      error: (error) => {
        console.error('Error loading multi-use recording codes:', error);
        this.errorMessage = 'Failed to load multi-use recording codes';
        this.allCodes = [];
        this.filteredCodes = [];
        this.isLoadingCodes = false;
      }
    });
  }

  applyFilters(): void {
    let codes = [...this.allCodes];

    if (this.isPrintedFilter === 'printed') {
      codes = codes.filter(c => c.isPrinted === true);
    } else if (this.isPrintedFilter === 'notPrinted') {
      codes = codes.filter(c => c.isPrinted === false);
    }

    if (this.createdDateFrom || this.createdDateTo) {
      codes = codes.filter(code => {
        if (!code.createdDateTime) return false;
        const dateOnly = code.createdDateTime.substring(0, 10); // yyyy-MM-dd
        if (this.createdDateFrom && dateOnly < this.createdDateFrom) return false;
        if (this.createdDateTo && dateOnly > this.createdDateTo) return false;
        return true;
      });
    }

    this.filteredCodes = codes;
    this.currentPage = 1;
  }

  get paginatedCodes(): MultiUseRecordingCodeResponseDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCodes.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCodes.length / this.pageSize) || 1;
  }

  get paginationStart(): number {
    return this.filteredCodes.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCodes.length);
  }

  goToPage(page: number): void {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
  }

  markAsPrinted(code: MultiUseRecordingCodeResponseDto): void {
    if (code.isPrinted) return;
    this.errorMessage = '';
    this.successMessage = '';
    this.markingAsPrintedId = code.id;
    this.multiUseRecordingCodeService.markAsPrinted(code.id).subscribe({
      next: (updated) => {
        const idx = this.allCodes.findIndex(c => c.id === code.id);
        if (idx !== -1) this.allCodes[idx] = updated;
        this.applyFilters();
        this.markingAsPrintedId = null;
        this.successMessage = 'Marked as printed.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Error marking as printed:', err);
        this.errorMessage = 'Failed to mark as printed';
        this.markingAsPrintedId = null;
      }
    });
  }

  openDeleteModal(code: MultiUseRecordingCodeResponseDto): void {
    if (code.usageCount !== 0) return;
    this.selectedCodeForDelete = code;
    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedCodeForDelete = null;
    this.isDeleting = false;
  }

  deleteCode(): void {
    if (!this.selectedCodeForDelete || this.selectedCodeForDelete.usageCount !== 0) return;
    this.isDeleting = true;
    this.errorMessage = '';
    this.multiUseRecordingCodeService.delete(this.selectedCodeForDelete.id).subscribe({
      next: () => {
        this.allCodes = this.allCodes.filter(c => c.id !== this.selectedCodeForDelete!.id);
        this.applyFilters();
        this.closeDeleteModal();
        this.successMessage = 'Multi-use recording code deleted.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Error deleting multi-use recording code:', err);
        this.errorMessage = 'Failed to delete multi-use recording code';
        this.isDeleting = false;
      }
    });
  }

  getFieldDisplay(field: FieldResponseDto): string {
    return `${field.club.name} | ${field.name}`;
  }
}
