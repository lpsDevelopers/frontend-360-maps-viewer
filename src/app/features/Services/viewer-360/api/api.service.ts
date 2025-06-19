import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, timeout, tap, switchMap } from 'rxjs/operators';
import {ApiResponse, Hotspot, Panorama} from "../../../Model/types";

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = 'https://localhost:44331/api';
  private readonly timeoutDuration = 15000;
  constructor(private http: HttpClient) {}

  selectedImageUrl: string | ArrayBuffer | null = null;
  selectedImageName: string | null = null;

  getPanoramaById(id: number): Observable<ApiResponse<Panorama>> {
    return this.http.get<ApiResponse<Panorama[]>>(`${this.apiUrl}/panoramas`).pipe(
      timeout(this.timeoutDuration),
      switchMap((response) => {
        console.log(response);
        const panorama = response.data.find(p => p.id === id);
        console.log(panorama);
        const result: ApiResponse<Panorama> = {
          isSucces: !!panorama,
          message: panorama ? 'Consulta exitosa' : 'No se encontró el panorama',
          data: panorama || {} as Panorama,
          errors: panorama
            ? null
            : [{ PropertyName: 'id', ErrorMessage: 'Panorama no encontrado' }]
        };
        return of(result);
      }),
      catchError(this.handleError)
    );
  }

  getHotspots(): Observable<Hotspot[]> {
    return this.http.get<Hotspot[]>('assets/data/hotspots.json');
  }

  getPanoramaByLocationId(LocationId: number): Observable<ApiResponse<Panorama>> {
    return this.http.get<ApiResponse<Panorama[]>>(`${this.apiUrl}/panoramas`).pipe(
      timeout(this.timeoutDuration),
      switchMap((response) => {
        console.log(response);
        const panorama = response.data.find(p => p.locationId === LocationId);
        console.log(panorama);
        const result: ApiResponse<Panorama> = {
          isSucces: !!panorama,
          message: panorama ? 'Consulta exitosa' : 'No se encontró el panorama',
          data: panorama || {} as Panorama,
          errors: panorama
            ? null
            : [{ PropertyName: 'id', ErrorMessage: 'Panorama no encontrado' }]
        };
        return of(result);
      }),
      catchError(this.handleError)
    );
  }

  getAllPanoramas(): Observable<ApiResponse<Panorama[]>> {
    return this.http.get<ApiResponse<Panorama[]>>(`${this.apiUrl}/panoramas`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }
  getPanoramaByIdBackend(id: number): Observable<ApiResponse<Panorama>> {
    return this.http.get<ApiResponse<Panorama>>(`${this.apiUrl}/panoramas/${id}`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }



  onFileSelected(event: any) {
    const selectedFile = event.target.files[0];
    this.selectedImageName = selectedFile.name;
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target) {
          this.selectedImageUrl = e.target.result;
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error de conexión con el servidor';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error de red: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'No se puede conectar con el servidor. Por favor, verifica tu conexión.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Solicitud incorrecta';
          break;
        case 401:
          errorMessage = 'No autorizado. Por favor, inicie sesión.';
          break;
        case 404:
          errorMessage = 'El servicio no está disponible';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.error?.message || 'Error desconocido'}`;
      }
    }

    console.error('Error en la solicitud:', {
      status: error.status,
      message: errorMessage,
      error: error
    });

    return throwError(() => ({
      success: false,
      message: errorMessage,
      data: null,
      errors: [{
        PropertyName: 'Connection',
        ErrorMessage: errorMessage
      }]
    }));
  }
}
