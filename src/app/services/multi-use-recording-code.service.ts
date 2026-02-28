import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MultiUseRecordingCodeResponseDto {
  id: number;
  prefix: string;
  fieldId: number;
  createdDateTime: string;
  usageLimit?: number | null;
  usageCount: number;
  isPrinted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MultiUseRecordingCodeService {
  private readonly API_BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all multi-use recording codes for a specific field.
   * Endpoint: GET /multi-use-recording-codes/field/{fieldId}
   */
  getByField(fieldId: number | string): Observable<MultiUseRecordingCodeResponseDto[]> {
    return this.http.get<MultiUseRecordingCodeResponseDto[]>(
      `${this.API_BASE_URL}/multi-use-recording-codes/field/${fieldId}`
    );
  }

  /**
   * Mark a multi-use recording code as printed.
   * Endpoint: PUT /multi-use-recording-codes/{id}/mark-as-printed
   */
  markAsPrinted(id: number): Observable<MultiUseRecordingCodeResponseDto> {
    return this.http.put<MultiUseRecordingCodeResponseDto>(
      `${this.API_BASE_URL}/multi-use-recording-codes/${id}/mark-as-printed`,
      {}
    );
  }

  /**
   * Delete a multi-use recording code (only when usageCount is 0).
   * Endpoint: DELETE /multi-use-recording-codes/{id}
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_BASE_URL}/multi-use-recording-codes/${id}`
    );
  }
}
