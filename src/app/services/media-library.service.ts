import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MediaItemDto {
  type: 'photo' | 'video-highlight' | 'goal-event' | 'highlight-event';
  id: number;
  name: string;
  creationDateTime: string;
  presignedUrl: string;
  sizeBytes: number;
  s3Bucket: string;
  s3Key: string;
  
  // Goal event specific properties
  result?: string;
  elapsedTime?: string;
  teamName?: string;
  processingStatus?: 'RETRIEVED' | 'PROCESSING' | 'RETRYING' | 'PROCESSING_FAILED' | 'WAITING_FOR_SEGMENTS' | 'PENDING_EXTRACTION';
}

@Injectable({
  providedIn: 'root'
})
export class MediaLibraryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getMediaLibrary(matchCode: string): Observable<MediaItemDto[]> {
    return this.http.get<MediaItemDto[]>(`${this.apiUrl}/media-library/${matchCode}`);
  }

  getMediaLibraryByRecordingCode(recordingCode: string): Observable<MediaItemDto[]> {
    return this.http.get<MediaItemDto[]>(`${this.apiUrl}/media-library/recording-code/${recordingCode}`);
  }
}
