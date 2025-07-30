import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, timeout, tap, switchMap } from 'rxjs/operators';
import {LoginResponse, ApiResponse, Location, Panorama, User} from '../../Model/types';

@Injectable({
  providedIn: 'root'
})
export class EndpointService {

  private readonly apiUrl = 'https://localhost:44331/api';
  private readonly timeoutDuration = 15000;

  // Caché para panoramas por locationId
  private panoramasCache = new Map<string, ApiResponse<Panorama[]>>();

  constructor(private http: HttpClient) { }


  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/User/Login`, { email, password })
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  }

  userLogin(email: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/User/userEmail`, { params: { email: email } })
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  }

  getLocations(): Observable<ApiResponse<Location[]>>{
    return this.http.get<ApiResponse<Location[]>>(`${this.apiUrl}/locations`)
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  };

  getLocationsForCompanyId(companyId: number): Observable<ApiResponse<Location[]>> {
    return this.http.get<ApiResponse<Location[]>>(`${this.apiUrl}/locations/companyId/${companyId}`)
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  };

  getLocationsById(LocationsId: number ): Observable<ApiResponse<Location>> {
    return this.http.get<ApiResponse<Location>>(`${this.apiUrl}/locations/${LocationsId}`)
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      )
  }

  getPanoramasForLocation(Id: number): Observable<ApiResponse<Panorama>> {
    return this.http.get<ApiResponse<Panorama>>(`${this.apiUrl}/panoramas/location/${Id}`)
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      )
  }

  getLocationForCompany(Id: number ): Observable<ApiResponse<Location>> {
    return this.http.get<ApiResponse<Location>>(`${this.apiUrl}/locations/companyId/${Id}`)
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      )
  }

  loginAdmin(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/Admin/LoginAdmin`, { email, password })
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  }

  loginUser(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/User/LoginUser`, { email, password })
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  }

  preloadAllPanoramas(): Observable<ApiResponse<Panorama>[]> {
    return this.getLocations().pipe(
      switchMap(response => {
        if (!response.isSucces || !response.data.length) {
          return of<ApiResponse<Panorama>[]>([]);
        }
        const requests = response.data.map(loc => this.getPanoramasForLocation(loc.id));
        return forkJoin(requests);
      })
    );
  }

  clearPanoramasCache(locationId?: string) {
    if (locationId) {
      this.panoramasCache.delete(locationId);
    } else {
      this.panoramasCache.clear();
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
