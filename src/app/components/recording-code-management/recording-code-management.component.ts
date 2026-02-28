import { Component, OnInit } from '@angular/core';
import { RecordingCodeService, RecordingCodeDto } from '../../services/recording-code.service';
import { FieldService, FieldResponseDto } from '../../services/field.service';

@Component({
  selector: 'app-recording-code-management',
  templateUrl: './recording-code-management.component.html',
  styleUrls: ['./recording-code-management.component.scss']
})
export class RecordingCodeManagementComponent implements OnInit {
  fields: FieldResponseDto[] = [];
  allRecordingCodes: RecordingCodeDto[] = [];
  filteredRecordingCodes: RecordingCodeDto[] = [];

  pageSize = 10;
  currentPage = 1;

  selectedFieldId: number | null = null;
  hasSearched = false;

  // Frontend filters
  isUsedFilter: 'all' | 'used' | 'unused' = 'all';
  isMultiUseFilter: 'all' | 'multiUse' | 'singleUse' = 'all';
  hasUsageLimitFilter: 'all' | 'yes' | 'no' = 'all';
  wasFreeFilter: 'all' | 'yes' | 'no' = 'all';
  usedDateFrom: string | null = null; // yyyy-MM-dd
  usedDateTo: string | null = null;   // yyyy-MM-dd

  isLoadingFields = false;
  isLoadingCodes = false;

  errorMessage = '';

  constructor(
    private recordingCodeService: RecordingCodeService,
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
      this.allRecordingCodes = [];
      this.filteredRecordingCodes = [];
      this.hasSearched = false;
      return;
    }

    const fieldId = Number(fieldIdString);
    this.selectedFieldId = isNaN(fieldId) ? null : fieldId;

    // Clear previous results when changing field
    this.allRecordingCodes = [];
    this.filteredRecordingCodes = [];
    this.hasSearched = false;
  }

  searchRecordingCodes(): void {
    this.errorMessage = '';

    if (!this.selectedFieldId) {
      this.allRecordingCodes = [];
      this.filteredRecordingCodes = [];
      this.hasSearched = false;
      this.errorMessage = 'Please select a field to search recording codes.';
      return;
    }

    this.hasSearched = true;
    this.isLoadingCodes = true;
    this.recordingCodeService.getRecordingCodesByField(this.selectedFieldId).subscribe({
      next: (codes) => {
        this.allRecordingCodes = codes;
        this.applyFilters();
        this.isLoadingCodes = false;
      },
      error: (error) => {
        console.error('Error loading recording codes:', error);
        this.errorMessage = 'Failed to load recording codes';
        this.allRecordingCodes = [];
        this.filteredRecordingCodes = [];
        this.isLoadingCodes = false;
      }
    });
  }

  applyFilters(): void {
    let codes = [...this.allRecordingCodes];

    // Filter by isUsed
    if (this.isUsedFilter === 'used') {
      codes = codes.filter(code => code.isUsed === true);
    } else if (this.isUsedFilter === 'unused') {
      codes = codes.filter(code => code.isUsed === false);
    }

    // Filter by multi use
    if (this.isMultiUseFilter === 'multiUse') {
      codes = codes.filter(code => code.multiUseRecordingCode != null);
    } else if (this.isMultiUseFilter === 'singleUse') {
      codes = codes.filter(code => code.multiUseRecordingCode == null);
    }

    // Filter by has usage limit (multiUseRecordingCode.usageLimit == null or not)
    if (this.hasUsageLimitFilter === 'yes') {
      codes = codes.filter(code => code.multiUseRecordingCode?.usageLimit != null);
    } else if (this.hasUsageLimitFilter === 'no') {
      codes = codes.filter(code => code.multiUseRecordingCode == null || code.multiUseRecordingCode.usageLimit == null);
    }

    // Filter by wasFree
    if (this.wasFreeFilter === 'yes') {
      codes = codes.filter(code => code.wasFree === true);
    } else if (this.wasFreeFilter === 'no') {
      codes = codes.filter(code => code.wasFree === false);
    }

    // Filter by used date range (using date-only comparison)
    if (this.usedDateFrom || this.usedDateTo) {
      codes = codes.filter(code => {
        if (!code.usedDate) {
          return false;
        }

        const dateOnly = code.usedDate.substring(0, 10); // yyyy-MM-dd

        if (this.usedDateFrom && dateOnly < this.usedDateFrom) {
          return false;
        }

        if (this.usedDateTo && dateOnly > this.usedDateTo) {
          return false;
        }

        return true;
      });
    }

    this.filteredRecordingCodes = codes;
    this.currentPage = 1;
  }

  get paginatedCodes(): RecordingCodeDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRecordingCodes.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRecordingCodes.length / this.pageSize) || 1;
  }

  get paginationStart(): number {
    return this.filteredRecordingCodes.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredRecordingCodes.length);
  }

  goToPage(page: number): void {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
  }

  getFieldDisplay(field: FieldResponseDto): string {
    return `${field.club.name} | ${field.name}`;
  }

  getUsageIndexDisplay(code: RecordingCodeDto): string {
    if (code.usageIndex != null && code.multiUseRecordingCode) {
      const limit = code.multiUseRecordingCode.usageLimit;
      const limitStr = limit != null ? limit : '∞';
      return `${code.usageIndex} / ${limitStr}`;
    }
    return code.usageIndex != null ? String(code.usageIndex) : '—';
  }
}

