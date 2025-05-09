import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileStorageService {
  private readonly API_URL = 'http://localhost:8000/api';
  private readonly UPLOAD_PATH = 'C:/assets/uploaded'; // This will be used by backend

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadPath', this.UPLOAD_PATH);

    return this.http.post(`${this.API_URL}/upload_file/`, formData, {
      withCredentials: true
    });
  }

  getUploadedFiles(): Observable<any> {
    return this.http.get(`${this.API_URL}/files/`, {
      withCredentials: true
    });
  }

  deleteFile(fileName: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/files/${fileName}`, {
      withCredentials: true
    });
  }
} 