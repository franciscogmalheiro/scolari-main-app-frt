import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserDto {
  username: string;
  password?: string;
  email: string;
  firstName: string;
  lastName: string;
  roleType?: string;
  fieldId?: number;
  clubId?: number;
}

export interface UserResponseDto {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleType?: string;
  fieldId?: number;
  clubId?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_BASE_URL = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserResponseDto[]> {
    return this.http.get<UserResponseDto[]>(this.API_BASE_URL);
  }

  getUserById(id: number): Observable<UserResponseDto> {
    return this.http.get<UserResponseDto>(`${this.API_BASE_URL}/${id}`);
  }

  createUser(user: UserDto): Observable<UserResponseDto> {
    return this.http.post<UserResponseDto>(this.API_BASE_URL, user);
  }

  updateUser(id: number, user: UserDto): Observable<UserResponseDto> {
    return this.http.put<UserResponseDto>(`${this.API_BASE_URL}/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/${id}`);
  }
} 