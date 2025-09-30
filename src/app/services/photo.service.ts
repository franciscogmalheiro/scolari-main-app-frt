import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PhotoItemDto {
  id: number;
  name: string;
  creationDateTime: string;
  presignedUrl: string;
}

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPhotos(matchCode: string): Observable<PhotoItemDto[]> {
    return this.http.get<PhotoItemDto[]>(`${this.apiUrl}/photo/${matchCode}`);
  }
}


