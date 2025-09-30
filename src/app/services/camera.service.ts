import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Capture photo using device camera
   * @returns Promise<File | null> - The captured photo file or null if cancelled/error
   */
  async capturePhoto(countdownSeconds: number = 0): Promise<File | null> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Request camera access with front camera preference
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Front camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Create video element to display camera feed
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('data-camera', 'front'); // For mirror flip CSS
      video.play();

      // Create a modal overlay for camera preview
      const modal = this.createCameraModal(video);

      return new Promise((resolve) => {
        // Handle capture button click
        const captureButton = modal.querySelector('.capture-btn') as HTMLButtonElement;
        const cancelButton = modal.querySelector('.cancel-btn') as HTMLButtonElement;
        let countdownInterval: any = null;
        let isCountingDown = false;
        let countdownOverlayEl: HTMLDivElement | null = null;

        const doCleanup = () => {
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }
        };

        const doCapture = () => {
          // Capture photo from video stream
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            
            // Convert canvas to blob
            canvas.toBlob((blob) => {
              if (blob) {
                const file = new File([blob], 'match-photo.jpg', { type: 'image/jpeg' });
                doCleanup();
                this.cleanup(stream, modal);
                resolve(file);
              } else {
                doCleanup();
                this.cleanup(stream, modal);
                resolve(null);
              }
            }, 'image/jpeg', 0.8);
          } else {
            doCleanup();
            this.cleanup(stream, modal);
            resolve(null);
          }
        };

        captureButton.onclick = () => {
          if (countdownSeconds && countdownSeconds > 0 && !isCountingDown) {
            // First click starts countdown
            const contentEl = modal.querySelector('.camera-modal-content') as HTMLElement;
            const countdownEl = document.createElement('div');
            countdownEl.className = 'camera-countdown-overlay';
            countdownEl.textContent = String(countdownSeconds);
            countdownEl.style.cssText = `
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 96px;
              font-weight: 800;
              color: #ffffff;
              text-shadow: 0 2px 8px rgba(0,0,0,0.6);
              background: rgba(0,0,0,0.25);
              pointer-events: none;
            `;
            contentEl.style.position = 'relative';
            contentEl.appendChild(countdownEl);
            countdownOverlayEl = countdownEl;

            isCountingDown = true;
            captureButton.disabled = true;

            let remaining = countdownSeconds;
            countdownInterval = setInterval(() => {
              remaining -= 1;
              if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                if (countdownOverlayEl && countdownOverlayEl.parentNode) {
                  countdownOverlayEl.parentNode.removeChild(countdownOverlayEl);
                }
                captureButton.disabled = false;
                isCountingDown = false;
                doCapture();
              } else if (countdownOverlayEl) {
                countdownOverlayEl.textContent = String(remaining);
              }
            }, 1000);
            return;
          }

          // No countdown configured -> capture immediately
          doCapture();
        };

        cancelButton.onclick = () => {
          doCleanup();
          // Remove overlay if present
          if (countdownOverlayEl && countdownOverlayEl.parentNode) {
            countdownOverlayEl.parentNode.removeChild(countdownOverlayEl);
          }
          isCountingDown = false;
          this.cleanup(stream, modal);
          resolve(null);
        };


        // Auto-cleanup on modal close
        /*const closeButton = modal.querySelector('.close-btn') as HTMLButtonElement;
        closeButton.onclick = () => {
          doCleanup();
          this.cleanup(stream, modal);
          resolve(null);
        };*/
      });

    } catch (error) {
      console.error('Error accessing camera:', error);
      return null;
    }
  }

  /**
   * Upload photo to backend
   * @param matchCode - The match code
   * @param photoFile - The photo file to upload
   * @returns Observable<any> - The upload response
   */
  uploadPhoto(matchCode: string, photoFile: File): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('photo', photoFile);

    return this.http.post(`${this.apiUrl}/photo/upload/${matchCode}`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  /**
   * Create camera modal overlay
   */
  private createCameraModal(video: HTMLVideoElement): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
      <div class="camera-modal-content">
        <div class="camera-header">
        <div class="camera-controls">
          <button class="cancel-btn">Cancel</button>
          <button class="capture-btn">
            <i class="fas fa-camera"></i>
          </button>
        </div>
        </div>
        <div class="camera-preview">
          <video autoplay muted playsinline></video>
        </div>
      </div>
    `;

    // Style the modal
    // z-index: 10002 - Higher than photo-capture-modal (10000) and photo-preview-modal (10001)
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10002;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const content = modal.querySelector('.camera-modal-content') as HTMLElement;
    content.style.cssText = `
      background: lightgray;
      border-radius: 15px;
      padding: 20px;
      max-width: 90%;
      max-height: 90%;
      text-align: center;
    `;

    const preview = modal.querySelector('.camera-preview') as HTMLElement;
    preview.style.cssText = `
      margin: 20px 0;
      border-radius: 10px;
      overflow: hidden;
      background: #000;
    `;

    const videoElement = modal.querySelector('video') as HTMLVideoElement;
    videoElement.srcObject = video.srcObject;
    videoElement.style.cssText = `
      width: 100%;
      max-width: 500px;
      height: auto;
      display: block;
    `;

    const controls = modal.querySelector('.camera-controls') as HTMLElement;
    controls.style.cssText = `
      display: flex;
      gap: 15px;
      justify-content: center;
    `;

    const buttons = modal.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.style.cssText = `
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
      `;
    });

    const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;
    cancelBtn.style.cssText += `
      background: #6c757d;
      color: white;
    `;

    const captureBtn = modal.querySelector('.capture-btn') as HTMLButtonElement;
    captureBtn.style.cssText += `
      background: #007bff;
      color: white;
    `;

    document.body.appendChild(modal);
    return modal;
  }

  /**
   * Cleanup camera stream and modal
   */
  private cleanup(stream: MediaStream, modal: HTMLElement): void {
    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());
    
    // Remove modal
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }
}
