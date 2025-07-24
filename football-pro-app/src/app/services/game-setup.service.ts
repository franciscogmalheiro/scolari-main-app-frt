import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Field {
  id: number;
  name: string;
  address: string;
  matches: any[];
}

export interface Sport {
  id: number;
  code: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameSetupService {

  constructor(private http: HttpClient) { }

  getFields(): Observable<Field[]> {
    return this.http.get<Field[]>('/api/fields');
  }

  getSportsByField(fieldId: number): Observable<Sport[]> {
    return this.http.get<Sport[]>(`/api/field-sports/field/${fieldId}/sports`);
  }
} 