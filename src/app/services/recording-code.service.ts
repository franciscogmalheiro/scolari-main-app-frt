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
   * @returns Observable of RecordingCodeDto
   */
  validateRecordingCode(code: string): Observable<RecordingCodeDto> {
    return this.http.get<RecordingCodeDto>(`${this.API_BASE_URL}/recording-codes/code/${code}`);
  }
}
