import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError, timeout } from 'rxjs';
import { LoginResponse, ApiResponse } from '../../model/types';

@Injectable({
  providedIn: 'root'
})
export class EndpointService {

  private readonly apiUrl = 'http://localhost:3000/api';
  private readonly timeoutDuration = 15000;

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/signin`, { email, password })
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
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
