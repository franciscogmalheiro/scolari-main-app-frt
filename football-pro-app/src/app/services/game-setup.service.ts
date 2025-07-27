import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  getSportsByField(fieldId: number): Observable<Sport[]> {
    return this.http.get<Sport[]>(`/api/field/${fieldId}/sports`);
  }
} 