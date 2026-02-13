import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrackingEventDto {
  actionName: string;
  timestamp: string;
  userAgent?: string;
  metadata?: Record<string, any>; // Optional metadata for additional context
}

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private readonly API_BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Track a user interaction/event
   * @param eventData - Data about the tracking event
   * @returns Observable<any> - The tracking response
   */
  trackEvent(eventData: TrackingEventDto): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/tracking/events`, eventData);
  }
}










