import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FormModel {
  id: number;
  name: string;
  template: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private apiUrl = 'https://localhost:7073/api/models';

  constructor(private http: HttpClient) { }

  saveForm(formData: FormModel): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  loadForms(): Observable<FormModel[]> {
    return this.http.get<FormModel[]>(this.apiUrl);
  }

  getFormById(id: number): Observable<FormModel> {
    return this.http.get<FormModel>(`${this.apiUrl}/${id}`);
  }
}