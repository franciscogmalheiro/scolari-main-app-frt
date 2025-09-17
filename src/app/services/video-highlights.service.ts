import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VideoHighlight {
  id: number;
  name: string;
  match: any;
  creationDateTime: string;
  s3Bucket: string;
  s3Key: string;
  sizeBytes: number;
  presignedUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoHighlightsService {

  constructor(private http: HttpClient) { }

  /**
   * Get video highlights for a specific match
   * @param matchCode The match code to get highlights for
   * @returns Observable of VideoHighlight array
   */
  getVideoHighlights(matchCode: string): Observable<VideoHighlight[]> {
    return this.http.get<VideoHighlight[]>(`${environment.apiUrl}/video-highlights/match/code/${matchCode}`);
  }

  /**
   * Download a specific video highlight
   * @param highlightId The ID of the highlight to download
   * @returns Observable of the video stream
   */
  downloadVideoHighlight(highlightId: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/video-highlights/${highlightId}/download`, {
      responseType: 'blob'
    });
  }

  /**
   * Format file size from bytes to human readable format
   * @param bytes File size in bytes
   * @returns Formatted file size string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format date time to locale string
   * @param dateTime ISO date time string
   * @returns Formatted date time string
   */
  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  /**
   * Build filename for a highlight
   * @param highlight The video highlight object
   * @returns Formatted filename
   */
  buildFilenameForHighlight(highlight: VideoHighlight): string {
    const timestamp = new Date(highlight.creationDateTime).toISOString().split('T')[0];
    const name = highlight.name.replace(/[^0-9A-Za-z_-]/g, '');
    return `${name}_${timestamp}.mp4`;
  }
}




