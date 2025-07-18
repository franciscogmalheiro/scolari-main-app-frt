import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-modal',
  templateUrl: './qr-modal.component.html',
  styleUrls: ['./qr-modal.component.scss']
})
export class QrModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() gameId = '';
  @Input() qrCodeData = ''; // This will be provided by the backend
  @Output() closeModal = new EventEmitter<void>();

  qrCodeUrl = '';

  ngOnInit(): void {
    this.generateQRCode();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gameId'] || changes['qrCodeData']) {
      this.generateQRCode();
    }
  }

  private async generateQRCode(): Promise<void> {
    try {
      // Generate QR code with game ID and some sample data
      const qrData = this.qrCodeData || `GameID: ${this.gameId || 'XXXX'}\nTimestamp: ${new Date().toISOString()}`;
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