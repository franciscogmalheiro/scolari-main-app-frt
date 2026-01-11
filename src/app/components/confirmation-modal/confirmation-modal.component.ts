import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss']
})
export class ConfirmationModalComponent {
  @Input() isVisible = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() imageUrl?: string;
  @Input() confirmButtonColor?: string;
  @Input() cancelButtonColor?: string;
  @Input() disableOverlayClose = false; // When true, clicking overlay won't close the modal
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget && !this.disableOverlayClose) {
      this.cancel.emit();
    }
  }

  get buttonStyles(): { [key: string]: string } {
    const styles: { [key: string]: string } = {};
    if (this.confirmButtonColor) {
      styles['--confirm-color'] = this.confirmButtonColor;
      styles['--confirm-text-color'] = this.getContrastColor(this.confirmButtonColor);
    }
    if (this.cancelButtonColor) {
      styles['--cancel-color'] = this.cancelButtonColor;
      styles['--cancel-text-color'] = this.getContrastColor(this.cancelButtonColor);
    }
    return styles;
  }

  /**
   * Determines if a color is white (or very close to white) and returns appropriate text color
   * Returns '#000000' only if the color is white, '#ffffff' otherwise
   */
  private getContrastColor(hexColor: string): string {
    if (!hexColor) return '#ffffff';
    
    // Remove # if present
    let hex = hexColor.replace('#', '').toLowerCase();
    
    // Handle 3-character hex colors (e.g., #fff -> #ffffff)
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Validate hex color
    if (!/^[0-9a-f]{6}$/i.test(hex)) {
      return '#ffffff'; // Default to white text if invalid
    }
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Check if the color is white or very close to white
    // White is #ffffff (255, 255, 255), but we'll also accept very light colors
    // Threshold: if all RGB values are above 240, consider it white/very light
    const isWhite = r >= 240 && g >= 240 && b >= 240;
    
    // Only return black text if the color is white, otherwise use white text
    return isWhite ? '#000000' : '#ffffff';
  }
} 