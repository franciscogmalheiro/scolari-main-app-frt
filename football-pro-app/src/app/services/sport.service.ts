import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Sport {
  id: number;
  name: string;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SportService {
  private readonly API_BASE_URL = '/api/sports';

  constructor(private http: HttpClient) {}

  getAllSports(): Observable<Sport[]> {
    return this.http.get<Sport[]>(this.API_BASE_URL);
  }

  getSportsByField(fieldId: number): Observable<Sport[]> {
    return this.http.get<Sport[]>(`/api/field-sports/field/${fieldId}/sports`);
  }
} 