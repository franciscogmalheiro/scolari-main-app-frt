import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface TeamEditData {
  team: 'A' | 'B';
  name: string;
  color: string;
}

@Component({
  selector: 'app-team-edit-modal',
  templateUrl: './team-edit-modal.component.html',
  styleUrls: ['./team-edit-modal.component.scss']
})
export class TeamEditModalComponent {
  private _isOpen = false;
  private _teamData: TeamEditData | null = null;
  private _lastTeamId: string | null = null;

  @Input()
  set isOpen(value: boolean) {
    const wasOpen = this._isOpen;
    this._isOpen = value;
    // Reset state when opening the modal
    if (value && !wasOpen && this._teamData) {
      this.resetState();
    }
  }
  get isOpen() {
    return this._isOpen;
  }

  @Input()
  set teamData(value: TeamEditData | null) {
    this._teamData = value;
    // Only reset when switching to a different team
    if (value && value.team !== this._lastTeamId) {
      this._lastTeamId = value.team;
      this.resetState();
    }
  }
  get teamData() {
    return this._teamData;
  }

  @Output() save = new EventEmitter<TeamEditData>();
  @Output() cancel = new EventEmitter<void>();

  editedName = '';
  editedColor = '';

  // Predefined color options
  colorOptions = [
    '#ff6b35', // Orange
    '#007bff', // Blue
    '#28a745', // Green
    '#dc3545', // Red
    '#6f42c1', // Purple
    '#fd7e14', // Dark Orange
    '#20c997', // Teal
    '#e83e8c', // Pink
    '#ffc107', // Yellow
    '#6c757d', // Gray
    '#343a40', // Dark Gray
    '#17a2b8', // Cyan
    '#ff4757', // Bright Red
    '#2ed573', // Bright Green
    '#3742fa', // Bright Blue
    '#ffa502'  // Bright Orange
  ];

  private resetState() {
    this.editedName = this._teamData?.name || '';
    this.editedColor = this._teamData?.color || '';
  }

  onSave(): void {
    const saveData = {
      team: this._teamData?.team || 'A',
      name: this.editedName.trim(),
      color: this.editedColor
    };
    this.save.emit(saveData);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  selectColor(color: string): void {
    this.editedColor = color;
  }

  isSelectedColor(color: string): boolean {
    return this.editedColor === color;
  }
}
