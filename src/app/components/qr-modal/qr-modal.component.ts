import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-modal',
  templateUrl: './qr-modal.component.html',
  styleUrls: ['./qr-modal.component.scss']
})
export class QrModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() gameId = ''; // This will contain the match code from the backend
  @Input() qrCodeData = ''; // This will be provided by the backend
  @Output() closeModal = new EventEmitter<void>();

  qrCodeUrl = '';

  ngOnInit(): void {
    // Don't generate QR code on init - wait until modal is visible
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only generate QR code when modal becomes visible or when gameId/qrCodeData changes
    if (changes['isVisible'] && changes['isVisible'].currentValue === true) {
      this.generateQRCode();
    } else if ((changes['gameId'] || changes['qrCodeData']) && this.isVisible) {
      this.generateQRCode();
    }
  }

  private async generateQRCode(): Promise<void> {
    try {
      // Use the match code from the backend - no fallback generation
      let qrData: string;
      
      if (this.qrCodeData) {
        // If backend provides specific QR code data, use it
        qrData = this.qrCodeData;
      } else if (this.gameId) {
        // Use the backend match code to create a structured QR code
        const qrCodeInfo = {
          matchCode: this.gameId,
          timestamp: new Date().toISOString(),
          type: 'match'
        };
        qrData = JSON.stringify(qrCodeInfo);
      } else {
        // Cannot generate QR code without backend match code
        console.error('Cannot generate QR code: Backend match code is required');
        return;
      }

      this.qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  onCloseClick(): void {
    this.closeModal.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }
} 