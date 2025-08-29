import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FieldDto {
  id?: number;
  name: string;
  sportId: number;
}

export interface FieldResponseDto {
  id: number;
  name: string;
  sportId: number;
  sportName?: string;
  club: {
    id: number;
    name: string;
    address: string;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FieldService {
  private readonly API_BASE_URL = `${environment.apiUrl}/fields`;

  constructor(private http: HttpClient) {}

  getAllFields(): Observable<FieldResponseDto[]> {
    return this.http.get<FieldResponseDto[]>(this.API_BASE_URL);
  }

  getFieldById(id: number): Observable<FieldResponseDto> {
    return this.http.get<FieldResponseDto>(`${this.API_BASE_URL}/${id}`);
  }

  createField(field: FieldDto): Observable<FieldResponseDto> {
    return this.http.post<FieldResponseDto>(this.API_BASE_URL, field);
  }

  updateField(id: number, field: FieldDto): Observable<FieldResponseDto> {
    return this.http.put<FieldResponseDto>(`${this.API_BASE_URL}/${id}`, field);
  }

  deleteField(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/${id}`);
  }
} 