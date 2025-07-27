import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClubDto {
  id?: number;
  name: string;
  description?: string;
  foundedYear?: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface ClubResponseDto {
  id: number;
  name: string;
  description?: string;
  foundedYear?: number;
  address?: string;
  city?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClubService {
  private readonly API_BASE_URL = '/api/clubs';

  constructor(private http: HttpClient) {}

  getAllClubs(): Observable<ClubResponseDto[]> {
    return this.http.get<ClubResponseDto[]>(this.API_BASE_URL);
  }

  getClubById(id: number): Observable<ClubResponseDto> {
    return this.http.get<ClubResponseDto>(`${this.API_BASE_URL}/${id}`);
  }

  createClub(club: ClubDto): Observable<ClubResponseDto> {
    return this.http.post<ClubResponseDto>(this.API_BASE_URL, club);
  }

  updateClub(id: number, club: ClubDto): Observable<ClubResponseDto> {
    return this.http.put<ClubResponseDto>(`${this.API_BASE_URL}/${id}`, club);
  }

  deleteClub(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/${id}`);
  }
} 