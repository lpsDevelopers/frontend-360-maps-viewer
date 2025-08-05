import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, timeout, tap, switchMap } from 'rxjs/operators';
import {ApiResponse, Hotspot, Panorama} from "../../../Model/types";
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = 'http://localhost:5277/api';
  private readonly timeoutDuration = 15000;
  constructor(private http: HttpClient) {}

  selectedImageUrl: string | ArrayBuffer | null = null;
  selectedImageName: string | null = null;

  getPosteById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Postes/${id}`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  updatePoste(id: number, posteData: any): Observable<any> {
    const url = `${this.apiUrl}/postes/${id}`;

    return this.http.put<any>(url, posteData).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }
  deletePoste(id: number): Observable<any> {
    const url = `${this.apiUrl}/postes/${id}`;

    return this.http.delete<any>(url).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  getAllHotspots():Observable<Hotspot> {
    return this.http.get<Hotspot>(this.apiUrl).pipe(
      tap(hotspots => {
        console.log( 'Todos los hotspots:', hotspots);
      })
    );
  }
  uploadHotspotWithImages(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/Files/upload`, formData);
  }
  postFileUpload(file: any) :Observable<any> {
    console.log('[ApiService] Enviando archivo:', file);
    return this.http.post(`${this.apiUrl}/file/upload`, file)
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
  uploadFile(formData: FormData) {
    return this.http.post(`${this.apiUrl}/Files/upload`, formData, {
      responseType: 'text'  // Porque tu curl acepta 'text/plain'
    });
  }

  uploadFile2(formData: FormData) {
    return this.http.post(`${this.apiUrl}/Files/upload`, formData, {
    });
  }

  postPoste(posteData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Postes`, posteData)
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

  postPanorama(panoramaData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Panoramas`, panoramaData)
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

  postHotspot(hotspot: Hotspot): Observable<any> {
    console.log('[ApiService] Enviando hotspot:', hotspot);
    return this.http.post(`${this.apiUrl}/Postes`, hotspot).pipe(
      tap(response => {
        console.log('[ApiService] Hotspot guardado con éxito:', response);
      }),
      catchError(error => {
        console.error('[ApiService] Error al guardar hotspot:', error);
        return throwError(() => error);
      })
    );
  }

  updatePanoramaHasHotspot(panoramaData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/Panoramas/Edit`, panoramaData)
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

  updatePanoramaHasHotspot2(panoramaId: number, HasHotspot: number): Observable<any> {
    const body = {
      panoramaId,
      HasHotspot
    };

    return this.http.put<any>(`${this.apiUrl}/Panoramas/Edit`, body).pipe(
      tap(response => {
        console.log(`Panorama ${panoramaId} actualizado correctamente con HasHotspot = ${HasHotspot}`);
        console.log('Respuesta del backend:', response);
      })
    );
  }
  getPanoramaHasHotspots(): Observable<any>{
    return this.http.get<any>(`${this.apiUrl}/Panoramas/has-hotspots`).pipe(
      tap( panoramas => {
        console.log( 'Todos los panoramas de activos:', panoramas);
      })
    );
  }

  getColorByHotspot(panoramaId: number): Observable<string | null> {
    return this.http
      .get<{ isSucces: boolean; data: Hotspot[] }>(`${this.apiUrl}/hotspots/panoramaId/${panoramaId}`)
      .pipe(
        map(res => {
          console.log('[ApiService] Respuesta recibida:', res);
          // Tomamos el primer hotspot, si existe, y devolvemos su propiedad "type"
          const firstHotspot = res.data[0];
          return firstHotspot ? firstHotspot.tipoPoste : null;
        })
      );
  }

  getPostesByPanorama(panoramaId: number): Observable<Hotspot[]> {
    return this.http
      .get<{ isSucces: boolean; data: Hotspot[] }>(`${this.apiUrl}/postes/panoramaId/${panoramaId}`)
      .pipe(
        map(res => {
          console.log('[ApiService] Respuesta recibida:', res);
          return res.data || [];
        })
      );
  }

  uploadFiles(files: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload`, files);
  }

  postHotspotWithFiles(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/hotspots/with-files`, formData);
  }

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
