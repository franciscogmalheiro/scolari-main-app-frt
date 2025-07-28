import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FieldCameraDto {
  fieldId: number;
  cameraName: string;
  cameraModel: string;
  ipAddress: string;
  username: string;
  password: string;
  port?: number;
}

export interface FieldCameraResponseDto {
  id: number;
  fieldId: number;
  cameraName: string;
  cameraModel: string;
  ipAddress: string;
  username: string;
  password: string;
  port: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FieldCameraService {
  private readonly API_BASE_URL = '/api/field-cameras';

  constructor(private http: HttpClient) {}

  getCamerasByFieldId(fieldId: number): Observable<FieldCameraResponseDto[]> {
    return this.http.get<FieldCameraResponseDto[]>(`${this.API_BASE_URL}/field/${fieldId}`);
  }

  getCameraById(id: number): Observable<FieldCameraResponseDto> {
    return this.http.get<FieldCameraResponseDto>(`${this.API_BASE_URL}/${id}`);
  }

  createCamera(camera: FieldCameraDto): Observable<FieldCameraResponseDto> {
    return this.http.post<FieldCameraResponseDto>(this.API_BASE_URL, camera);
  }

  updateCamera(id: number, camera: FieldCameraDto): Observable<FieldCameraResponseDto> {
    return this.http.put<FieldCameraResponseDto>(`${this.API_BASE_URL}/${id}`, camera);
  }

  deleteCamera(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/${id}`);
  }
} 