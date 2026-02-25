import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RecordingCodeDto {
  id: number;
  code: string;
  fieldId: number;
  isUsed: boolean;
  usedDate: string | null;
  createdDateTime: string;
  vipCodeId?: number | null;
  vipCode?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RecordingCodeService {
  private readonly API_BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Validate a recording code by calling the backend API
   * @param code The recording code to validate
   * @param validateForRecording Optional parameter to include validateForRecording=true query param
   * @returns Observable of RecordingCodeDto
   */
  validateRecordingCode(code: string, validateForRecording?: boolean): Observable<RecordingCodeDto> {
    let url = `${this.API_BASE_URL}/recording-codes/code/${code}`;
    if (validateForRecording === true) {
      url += '?validateForRecording=true';
    }
    return this.http.get<RecordingCodeDto>(url);
  }

  /**
   * Request a free recording code for a specific field from the backend API
   * Endpoint: /recording-codes/field/{fieldId}/free
   * The backend returns a RecordingCodeDto or a 500 error if not available
   * @param fieldId The field identifier
   * @param timestamp ISO timestamp for when the request is made
   */
  getFreeRecordingCode(fieldId: number | string, timestamp: string): Observable<RecordingCodeDto> {
    const body = { timestamp };
    return this.http.post<RecordingCodeDto>(
      `${this.API_BASE_URL}/recording-codes/field/${fieldId}/free`,
      body
    );
  }
}
