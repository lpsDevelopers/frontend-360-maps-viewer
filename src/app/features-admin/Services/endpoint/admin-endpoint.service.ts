import { Injectable } from '@angular/core';
import {
  AllCompanies,
  AllHotspots,
  AllPanoramas,
  AllUsers,
  ApiResponse,
  LoginResponse,
  User
} from "../../Model/adminTypes";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {Observable, throwError} from "rxjs";
import {catchError, tap, timeout} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class AdminEndpointService {
  private readonly apiUrl = 'https://localhost:44331/api';
  private readonly timeoutDuration = 15000;

  // Caché para panoramas por locationId
  private panoramasCache = new Map<string, ApiResponse<any[]>>();

  constructor(private http: HttpClient) { }

  uploadFileConvert(formData: FormData) {
    return this.http.post( `${this.apiUrl}/Files/upload`, formData).pipe(
        tap(response => {
          console.log('Esta es la respuesta para las fotos:', response);
        }),
        catchError(error => {
          console.error('Error al subir las fotos:', error);
          return throwError(() => error);
        })
      );
  }

  // Add Function
  postPostes(panoramaData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Postes`, panoramaData)
      .pipe(
        tap(response => {
          console.log('[AdminEndpointService] Panorama guardado con éxito:', response);
        }),
        catchError(error => {
          console.error('[AdminEndpointService] Error al guardar panorama:', error);
          return throwError(() => error);
        })
      );
  }

  updatePoste(posteData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/Postes/Edit`, posteData)
      .pipe(
        tap(response => {
          console.log('[AdminEndpointService] Panorama guardado con éxito:', response);
        }),
        catchError(error => {
          console.error('[AdminEndpointService] Error al guardar panorama:', error);
          return throwError(() => error);
        })
      );
  }
  postPanoramas(panoramaData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Panoramas`, panoramaData)
      .pipe(
        tap(response => {
          console.log('[AdminEndpointService] Panorama guardado con éxito:', response);
        }),
        catchError(error => {
          console.error('[AdminEndpointService] Error al guardar panorama:', error);
          return throwError(() => error);
        })
      );
  }
  postLocation (LocationData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Locations`, LocationData)
      .pipe(
        tap(response => {
          console.log('[ApiService] Hotspot guardado con éxito:', response);
        }),
        catchError(error => {
          console.error('[ApiService] Error al guardar hotspot:', error);
          return throwError(() => error);
        })
      );
  }
  getAddressFromCoords(lat: number, lng: number) {
    return this.http.get<{ address: string }>(`${this.apiUrl}/Maps/geocode?lat=${lat}&lng=${lng}`);
  }

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

  allUsers(): Observable<ApiResponse<AllUsers[]>> {
    return this.http.get<any>(`${this.apiUrl}/User`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  allHotspots(): Observable<ApiResponse<AllHotspots[]>> {
    return this.http.get<any>(`${this.apiUrl}/Postes`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  allLocations(): Observable<ApiResponse<any[]>>{
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/locations`)
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  };
  allPanoramas(): Observable<ApiResponse<AllPanoramas[]>>{
    return this.http.get<ApiResponse<AllPanoramas[]>>(`${this.apiUrl}/panoramas`)
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  };

  allCompanies(): Observable<ApiResponse<AllCompanies[]>>{
    return this.http.get<ApiResponse<AllCompanies[]>>(`${this.apiUrl}/companies`)
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

  getPanoramasForLocation(Id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/panoramas/location/${Id}`)
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
