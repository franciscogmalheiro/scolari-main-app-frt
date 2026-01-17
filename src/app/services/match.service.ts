import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MatchDto {
  fieldId?: number;
  teamAName: string;
  teamBName: string;
  sportId: number;
  recordMode?: boolean;
  recordingCode?: string;
  teamAColor?: string;
  teamBColor?: string;
}

export interface MatchResponse {
  id: number;
  matchCode: string;
  fieldId: number;
  teamAName: string;
  teamBName: string;
  sportId: number;
  status: string;
  createdAt: string;
}

export interface MatchEventResponseDto {
  id: number;
  matchId: number;
  dateTime: string;
  eventTypeId: number;
  eventTypeName: string;
  teamName: string;
  elapsedTime: string;
  videoSegmentId: number;
  result?: string; // Score at the time of the event (e.g., "1-0", "2-1")
  presignedUrl: string; // Presigned URL to the video preview MP4 file
}

export interface FieldMatchResponseDto {
  id: number;
  matchCode: string;
  fieldId: number;
  fieldName: string;
  startDateTime: string;
  finishDateTime: string;
  teamAName: string;
  teamBName: string;
  finalResult: string;
  sportId: number;
  sportName: string;
  matchEvents: MatchEventResponseDto[];
  recordMode: boolean;
  recordingCode?: string;
  isFavorite?: boolean;
}

export interface IndividualMatchEventDto {
  matchId: number;
  recordingCode?: string;
  dateTime: string;
  eventName: string;
  teamName?: string;
  result: string;
  fieldCameraId?: number;
  isZoomRequired: boolean;
  elapsedTime?: string;
}

export interface MatchEventRequestDto {
  matchId: number;
  dateTime: string;
  eventTypeId?: number;
  eventName?: string;
  teamName?: string;
  result: string;
  fieldCameraId?: number;
  videoSegmentId?: number;
  previewStatus?: string;
  previewUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly API_BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  createMatch(matchData: MatchDto): Observable<MatchResponse> {
    return this.http.post<MatchResponse>(`${this.API_BASE_URL}/matches`, matchData);
  }

  uploadEvents(matchId: string, events: any[]): Observable<any> {
    const payload = { events: events };
    return this.http.post(`${this.API_BASE_URL}/match-events/upload/${matchId}`, payload);
  }


  finishMatch(matchCode: string, finalResult: string): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/matches/finish/${matchCode}`, { finalResult });
  }

  sendIndividualEvent(eventData: IndividualMatchEventDto): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/match-events`, eventData);
  }

  getMatchesByField(fieldId: number): Observable<FieldMatchResponseDto[]> {
    return this.http.get<FieldMatchResponseDto[]>(`${this.API_BASE_URL}/matches/field/${fieldId}`);
  }

  getMatchesByUser(): Observable<FieldMatchResponseDto[]> {
    return this.http.get<FieldMatchResponseDto[]>(`${this.API_BASE_URL}/matches/user`);
  }

  getMatchByCode(matchCode: string): Observable<FieldMatchResponseDto> {
    return this.http.get<FieldMatchResponseDto>(`${this.API_BASE_URL}/matches/code/${matchCode}`);
  }

  getMatchByRecordingCode(recordingCode: string): Observable<FieldMatchResponseDto> {
    return this.http.get<FieldMatchResponseDto>(`${this.API_BASE_URL}/matches/recordingCode/${recordingCode}`);
  }

  updateMatchEvent(eventId: number, eventData: MatchEventRequestDto): Observable<any> {
    return this.http.put(`${this.API_BASE_URL}/match-events/${eventId}`, eventData);
  }

  deleteMatchEvent(eventId: number): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/match-events/${eventId}`);
  }

  addMatchToUser(matchCode: string): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/matches/code/${matchCode}/users`, {});
  }

  addMatchToUserById(matchId: number): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/matches/${matchId}/users`, {});
  }

  removeMatchFromUser(matchId: number): Observable<any> {
    return this.http.delete(`${this.API_BASE_URL}/matches/${matchId}/users`);
  }
} 