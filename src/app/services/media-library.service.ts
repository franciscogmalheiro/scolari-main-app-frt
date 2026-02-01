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
  videoSegmentId?: number; // ID to use when associating with a user
  isFavorite?: boolean; // Whether this item is in the user's favorites
  
  // Match result properties
  teamAName?: string;
  finalResult?: string;
  teamBName?: string;
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

  getUserVideoSegments(): Observable<MediaItemDto[]> {
    return this.http.get<MediaItemDto[]>(`${this.apiUrl}/users/video-segments`);
  }

  addMatchEventToUser(matchEventId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/match-events/${matchEventId}/users`, {});
  }

  removeMatchEventFromUser(matchEventId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/match-events/${matchEventId}/users`);
  }

  invertZoom(recordingCode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/video-processor/invertZoom/${recordingCode}`, {});
  }
}
