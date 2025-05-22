import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, timeout, tap, switchMap } from 'rxjs/operators';
import { LoginResponse, ApiResponse, Location } from '../../Model/types';

@Injectable({
  providedIn: 'root'
})
export class EndpointService {

  private readonly apiUrl = 'http://localhost:3002/api';
  private readonly timeoutDuration = 15000;

  // Caché para panoramas por locationId
  private panoramasCache = new Map<string, any[]>();

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/authRoute/signin`, { email, password })
      .pipe(
        timeout(this.timeoutDuration),
        catchError(this.handleError)
      );
  }

  getLocations(): Observable<Location[]> {
    const url = `${this.apiUrl}/locations`;
    return this.http.get<Location[]>(url).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  getPanoramas(id: string): Observable<any[]> {
    if (this.panoramasCache.has(id)) {
      console.log(`⚡️ Panoramas cacheados para locationId ${id} encontrados, retornando cache.`);
      return of(this.panoramasCache.get(id)!);
    }

    const url = `${this.apiUrl}/panoramas?location_id=${id}`;
    return this.http.get<any[]>(url).pipe(
      timeout(this.timeoutDuration),
      tap(panoramas => {
        this.panoramasCache.set(id, panoramas);
        console.log(`📥 Panoramas cacheados para locationId ${id}`);
      }),
      catchError(this.handleError)
    );
  }

  // Método para precargar panoramas de todas las locations y cachearlas
  preloadAllPanoramas(): Observable<any[][]> {
    return this.getLocations().pipe(
      switchMap(locations => {
        if (!locations.length) {
          return of([]); // No hay locations, retornamos array vacío
        }
        // Mapear cada location a un observable getPanoramas
        const requests = locations.map(loc => this.getPanoramas(loc.id));
        // forkJoin espera que todas las llamadas terminen y devuelve los resultados en array
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
