import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationsService {
  private readonly SELECTED_LOCATION_KEY = 'selectedLocationId';
  private readonly LOCATION_LATITUDE = 'locationLatitude';
  private readonly LOCATION_LONGITUDE = 'locationLongitude';

  private coordinatesSubject = new BehaviorSubject<{ latitude: number, longitude: number } | null>(null);

  constructor() {
    // Cargar coordenadas al inicializar el servicio
    this.loadInitialCoordinates();
  }

  // Guardar ID
  setSelectedLocationId(id: string): void {
    localStorage.setItem(this.SELECTED_LOCATION_KEY, id);
  }

  getSelectedLocationId(): string | null {
    return localStorage.getItem(this.SELECTED_LOCATION_KEY);
  }

  clearSelectedLocationId(): void {
    localStorage.removeItem(this.SELECTED_LOCATION_KEY);
  }

  // Guardar coordenadas y notificar a suscriptores
  setCoordinates(latitude: number, longitude: number): void {
    try {
      localStorage.setItem(this.LOCATION_LATITUDE, latitude.toString());
      localStorage.setItem(this.LOCATION_LONGITUDE, longitude.toString());

      // ESTO ES CLAVE - Notificar a todos los suscriptores del cambio
      this.coordinatesSubject.next({ latitude, longitude });

      console.log(`Coordenadas guardadas y propagadas: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('Error al guardar coordenadas:', error);
    }
  }

  // Leer coordenadas actuales
  getCoordinates(): { latitude: number; longitude: number } | null {
    return this.coordinatesSubject.value;
  }

  // Observable para suscribirse a cambios
  getCoordinatesObservable() {
    return this.coordinatesSubject.asObservable();
  }

  // MÉTODO NUEVO - Cargar coordenadas iniciales
  loadInitialCoordinates(): void {
    const storedCoords = this.loadStoredCoordinates();
    if (storedCoords) {
      this.coordinatesSubject.next(storedCoords);
    }
  }

  // Cargar coordenadas del localStorage
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

  // Limpiar coordenadas
  clearCoordinates(): void {
    localStorage.removeItem(this.LOCATION_LATITUDE);
    localStorage.removeItem(this.LOCATION_LONGITUDE);
    this.coordinatesSubject.next(null);
  }
}
