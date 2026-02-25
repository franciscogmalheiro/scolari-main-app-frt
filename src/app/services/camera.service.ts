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
            
            // Flip horizontally to un-mirror the image (front-facing cameras are mirrored)
            // This ensures the final saved image is not mirrored
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
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
        <div class="camera-rotation-hint">
          <i class="fas fa-mobile-alt"></i>
          <span>Rode o telemóvel para horizontal</span>
        </div>
        <div class="camera-header">
        <div class="camera-controls">
          <button class="cancel-btn">
            <i class="fas fa-times"></i>
          </button>
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
      background: rgba(0, 0, 0, 0.9);
      border-radius: 15px;
      padding: 0;
      max-width: 90%;
      max-height: 90%;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    `;

    // Rotation hint
    const rotationHint = modal.querySelector('.camera-rotation-hint') as HTMLElement;
    rotationHint.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.9);
      color: #333;
      padding: 12px 20px;
      border-radius: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: 600;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    const hintIcon = rotationHint.querySelector('i') as HTMLElement;
    hintIcon.style.cssText = `
      font-size: 20px;
    `;
    
    // Add keyframe animations via style tag
    const style = document.createElement('style');
    style.id = 'camera-modal-animations';
    style.textContent = `
      @keyframes camera-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes camera-rotate-hint {
        0% { transform: rotate(0deg); }
        25% { transform: rotate(90deg); }
        50% { transform: rotate(90deg); }
        75% { transform: rotate(0deg); }
        100% { transform: rotate(0deg); }
      }
    `;
    document.head.appendChild(style);
    
    // Update hint animation names
    rotationHint.style.animation = 'camera-pulse 2s infinite';
    hintIcon.style.animation = 'camera-rotate-hint 2s infinite';

    const preview = modal.querySelector('.camera-preview') as HTMLElement;
    preview.style.cssText = `
      flex: 1;
      margin: 0;
      border-radius: 0;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const videoElement = modal.querySelector('video') as HTMLVideoElement;
    videoElement.srcObject = video.srcObject;
    // Mirror the video preview for front-facing camera (user sees themselves correctly)
    videoElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      transform: scaleX(-1);
      display: block;
    `;

    const controls = modal.querySelector('.camera-controls') as HTMLElement;
    controls.style.cssText = `
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 20px;
      z-index: 10;
    `;
    
    // Hide hint and adjust controls when in landscape
    const updateOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape) {
        rotationHint.style.display = 'none';
        controls.style.left = '20px';
        controls.style.top = '50%';
        controls.style.transform = 'translateY(-50%)';
        controls.style.flexDirection = 'column';
      } else {
        rotationHint.style.display = 'flex';
        controls.style.left = '20px';
        controls.style.top = '50%';
        controls.style.transform = 'translateY(-50%)';
        controls.style.flexDirection = 'column';
      }
    };
    
    window.addEventListener('resize', updateOrientation);
    updateOrientation();
    
    // Store cleanup function
    (modal as any).__orientationCleanup = () => {
      window.removeEventListener('resize', updateOrientation);
      const existingStyle = document.getElementById('camera-modal-animations');
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };

    const buttons = modal.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.style.cssText = `
        padding: 15px 20px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        font-weight: 600;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
      `;
    });

    const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;
    cancelBtn.style.cssText += `
      background: #dc3545;
      color: white;
    `;
    cancelBtn.onmouseenter = () => {
      cancelBtn.style.transform = 'scale(1.1)';
      cancelBtn.style.boxShadow = '0 6px 16px rgba(220, 53, 69, 0.5)';
    };
    cancelBtn.onmouseleave = () => {
      cancelBtn.style.transform = 'scale(1)';
      cancelBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    };

    const captureBtn = modal.querySelector('.capture-btn') as HTMLButtonElement;
    captureBtn.style.cssText += `
      background: #007bff;
      color: white;
    `;
    captureBtn.onmouseenter = () => {
      captureBtn.style.transform = 'scale(1.1)';
      captureBtn.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.5)';
    };
    captureBtn.onmouseleave = () => {
      captureBtn.style.transform = 'scale(1)';
      captureBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    };

    document.body.appendChild(modal);
    return modal;
  }

  /**
   * Cleanup camera stream and modal
   */
  private cleanup(stream: MediaStream, modal: HTMLElement): void {
    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());
    
    // Cleanup orientation listener and styles
    if ((modal as any).__orientationCleanup) {
      (modal as any).__orientationCleanup();
    }
    
    // Remove modal
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }
}
