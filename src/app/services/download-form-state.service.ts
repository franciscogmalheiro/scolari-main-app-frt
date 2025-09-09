import { Injectable } from '@angular/core';

export interface DownloadFormState {
  gameId: string;
  voucherCode: string;
  isGameValid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DownloadFormStateService {
  private formState: DownloadFormState | null = null;

  /**
   * Save the current form state
   */
  saveFormState(state: DownloadFormState): void {
    this.formState = { ...state };
  }

  /**
   * Get the saved form state
   */
  getFormState(): DownloadFormState | null {
    return this.formState;
  }

  /**
   * Clear the saved form state
   */
  clearFormState(): void {
    this.formState = null;
  }

  /**
   * Check if there's a saved form state
   */
  hasFormState(): boolean {
    return this.formState !== null;
  }
}

