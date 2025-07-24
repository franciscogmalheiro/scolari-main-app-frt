import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MatchDto {
  fieldId: number;
  teamAName: string;
  teamBName: string;
  sportId: number;
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
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly API_BASE_URL = '/api';

  constructor(private http: HttpClient) { }

  createMatch(matchData: MatchDto): Observable<MatchResponse> {
    return this.http.post<MatchResponse>(`${this.API_BASE_URL}/matches`, matchData);
  }

  uploadEvents(matchId: string, events: any[]): Observable<any> {
    const payload = { events: events };
    return this.http.post(`${this.API_BASE_URL}/match-events/upload/${matchId}`, payload);
  }

  getMatchEvents(matchCode: string): Observable<MatchEventResponseDto[]> {
    return this.http.get<MatchEventResponseDto[]>(`${this.API_BASE_URL}/match-events/match/code/${matchCode}?eventTypes=GOAL,HIGHLIGHT`);
  }
} 