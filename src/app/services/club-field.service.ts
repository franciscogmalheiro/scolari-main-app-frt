import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClubFieldDto {
  id?: number;
  name: string;
  sportIds: number[];
}

export interface CreateClubFieldRequest {
  clubId: number;
  field: {
    name: string;
    sports: number[];
  };
}

export interface ClubFieldResponseDto {
  id: number;
  clubId: number;
  clubName: string;
  fieldId: number;
  fieldName: string;
  fieldSports: Array<{
    id: number;
    fieldId: number;
    fieldName: string;
    sportId: number;
    sportCode: string;
    sportName: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ClubFieldService {
  private readonly API_BASE_URL = `${environment.apiUrl}/club-fields`;

  constructor(private http: HttpClient) {}

  getClubFields(clubId: number): Observable<ClubFieldResponseDto[]> {
    return this.http.get<ClubFieldResponseDto[]>(`${this.API_BASE_URL}/club/${clubId}`);
  }

  createClubField(clubId: number, field: ClubFieldDto): Observable<ClubFieldResponseDto> {
    const requestBody: CreateClubFieldRequest = {
      clubId: clubId,
      field: {
        name: field.name,
        sports: field.sportIds
      }
    };
    return this.http.post<ClubFieldResponseDto>(`${this.API_BASE_URL}/create-with-field`, requestBody);
  }

  updateClubField(clubId: number, fieldId: number, field: ClubFieldDto): Observable<ClubFieldResponseDto> {
    return this.http.put<ClubFieldResponseDto>(`${this.API_BASE_URL}/${clubId}/${fieldId}`, field);
  }

  deleteClubField(clubId: number, fieldId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/${clubId}/${fieldId}`);
  }
} 