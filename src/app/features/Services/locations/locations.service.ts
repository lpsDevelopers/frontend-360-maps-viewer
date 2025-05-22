import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationsService {
  private readonly SELECTED_LOCATION_KEY = 'selectedLocationId';
  private readonly LOCATION_LATITUDE = 'locationLatitude';
  private readonly LOCATION_LONGITUDE = 'locationLongitude';
  private readonly PANORAMA_KEY = 'panorama';

  private coordinatesSubject = new BehaviorSubject<{ latitude: number, longitude: number } | null>(null);
  private panoramaSubject = new BehaviorSubject<string | null>(null);

  constructor() {

    this.loadInitialCoordinates();
    this.loadInitialPanorama();
  }

  // ============= MÉTODOS DE LOCATION ID =============
  setSelectedLocationId(id: string): void {
    localStorage.setItem(this.SELECTED_LOCATION_KEY, id);
  }

  getSelectedLocationId(): string | null {
    return localStorage.getItem(this.SELECTED_LOCATION_KEY);
  }

  clearSelectedLocationId(): void {
    localStorage.removeItem(this.SELECTED_LOCATION_KEY);
  }


  setPanoramaForLocationId(id: string): void {
    localStorage.setItem(this.PANORAMA_KEY, id);

    this.panoramaSubject.next(id);
    console.log(`Panorama cambiado a location ID: ${id}`);
  }

  getPanoramaForLocationId(): string | null {
    return localStorage.getItem(this.PANORAMA_KEY);
  }

  getPanoramaObservable() {
    return this.panoramaSubject.asObservable();
  }

  clearPanorama(): void {
    localStorage.removeItem(this.PANORAMA_KEY);
    this.panoramaSubject.next(null);
  }

  setCoordinates(latitude: number, longitude: number): void {
    try {
      localStorage.setItem(this.LOCATION_LATITUDE, latitude.toString());
      localStorage.setItem(this.LOCATION_LONGITUDE, longitude.toString());

      // Notificar a todos los suscriptores del cambio
      this.coordinatesSubject.next({ latitude, longitude });

      console.log(`Coordenadas guardadas y propagadas: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('Error al guardar coordenadas:', error);
    }
  }

  getCoordinates(): { latitude: number; longitude: number } | null {
    return this.coordinatesSubject.value;
  }

  getCoordinatesObservable() {
    return this.coordinatesSubject.asObservable();
  }

  clearCoordinates(): void {
    localStorage.removeItem(this.LOCATION_LATITUDE);
    localStorage.removeItem(this.LOCATION_LONGITUDE);
    this.coordinatesSubject.next(null);
  }

  // ============= MÉTODOS DE INICIALIZACIÓN =============
  loadInitialCoordinates(): void {
    const storedCoords = this.loadStoredCoordinates();
    if (storedCoords) {
      this.coordinatesSubject.next(storedCoords);
    }
  }

  loadInitialPanorama(): void {
    const storedPanorama = localStorage.getItem(this.PANORAMA_KEY);
    if (storedPanorama) {
      this.panoramaSubject.next(storedPanorama);
    }
  }

  // ============= MÉTODOS PRIVADOS =============
  private loadStoredCoordinates(): { latitude: number; longitude: number } | null {
    try {
      const latStr = localStorage.getItem(this.LOCATION_LATITUDE) || '';
      const lngStr = localStorage.getItem(this.LOCATION_LONGITUDE) || '';

      if (!latStr || !lngStr) {
        return null;
      }

      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      return !isNaN(lat) && !isNaN(lng) ? { latitude: lat, longitude: lng } : null;
    } catch (error) {
      console.error('Error al cargar coordenadas del localStorage:', error);
      return null;
    }
  }
}
