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
  private readonly SELECTED_LOCATION_OBJECT_KEY = 'selectedLocationObject';

  private coordinatesSubject = new BehaviorSubject<{ latitude: number, longitude: number } | null>(null);
  private panoramaSubject = new BehaviorSubject<number | null>(null);

  constructor() {
    this.loadInitialCoordinates();
    this.loadInitialPanorama();
  }
  setLocations(locations: Location[]): void {
    localStorage.setItem('locations', JSON.stringify(locations));
  }

  getLocations(): Location[] | null {
    const stored = localStorage.getItem('locations');
    return stored ? JSON.parse(stored) : null;
  }
  // ============= MÉTODOS DE UBICACIÓN COMPLETA =============
  setSelectedLocation(location: Location): void {
    try {
      localStorage.setItem(this.SELECTED_LOCATION_OBJECT_KEY, JSON.stringify(location));
      console.log('Ubicación completa guardada en localStorage:', location);
    } catch (error) {
      console.error('Error al guardar la ubicación completa:', error);
    }
  }

  getSelectedLocation(): Location | null {
    const stored = localStorage.getItem(this.SELECTED_LOCATION_OBJECT_KEY);
    if (!stored) {
      console.log('No se encontró ubicación completa en localStorage');
      return null;
    }

    try {
      const parsed = JSON.parse(stored);
      console.log('Ubicación completa cargada desde localStorage:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error al parsear la ubicación guardada:', error);
      return null;
    }
  }

  clearSelectedLocation(): void {
    localStorage.removeItem(this.SELECTED_LOCATION_OBJECT_KEY);
    console.log('Ubicación completa eliminada del localStorage');
  }

  // ============= MÉTODOS DE LOCATION ID =============
  setSelectedLocationId(id: number): void {
    localStorage.setItem(this.SELECTED_LOCATION_KEY, id.toString());
    console.log('ID de ubicación guardado:', id);
  }

  getSelectedLocationId(): number | null {
    const stored = localStorage.getItem(this.SELECTED_LOCATION_KEY);

    if (!stored) {
      console.log('No se encontró ID de ubicación en localStorage');
      return null;
    }

    const id = parseInt(stored, 10);

    if (isNaN(id)) {
      console.warn('ID de ubicación no es un número válido:', stored);
      return null;
    }

    console.log('ID de ubicación cargado desde localStorage:', id);
    return id;
  }

  clearSelectedLocationId(): void {
    localStorage.removeItem(this.SELECTED_LOCATION_KEY);
    console.log('ID de ubicación eliminado del localStorage');
  }

  // ============= MÉTODOS DE PANORAMA =============
  setPanoramaForLocationId(id: number): void {
    localStorage.setItem(this.PANORAMA_KEY, id.toString());
    this.panoramaSubject.next(id);
    console.log('Panorama guardado:', id);
  }


  getPanoramaForLocationId(): number | null {
    const value = localStorage.getItem(this.PANORAMA_KEY);
    if (!value) {
      console.log('No se encontró panorama en localStorage');
      return null;
    }

    const id = parseInt(value, 10);
    if (isNaN(id)) {
      console.warn('Panorama no es un número válido:', value);
      return null;
    }

    console.log('Panorama cargado desde localStorage:', id);
    return id;
  }

  getPanoramaObservable() {
    return this.panoramaSubject.asObservable();
  }

  clearPanorama(): void {
    localStorage.removeItem(this.PANORAMA_KEY);
    this.panoramaSubject.next(null);
    console.log('Panorama eliminado del localStorage');
  }

  // ============= MÉTODOS DE COORDENADAS =============
  setCoordinates(latitude: number, longitude: number): void {
    try {
      localStorage.setItem(this.LOCATION_LATITUDE, latitude.toString());
      localStorage.setItem(this.LOCATION_LONGITUDE, longitude.toString());
      this.coordinatesSubject.next({ latitude, longitude });
      console.log(`Coordenadas guardadas: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('Error al guardar coordenadas:', error);
    }
  }

  getCoordinates(): { latitude: number; longitude: number } | null {
    const coords = this.coordinatesSubject.value;
    console.log('Coordenadas actuales del observable:', coords);
    return coords;
  }

  getCoordinatesObservable() {
    return this.coordinatesSubject.asObservable();
  }

  clearCoordinates(): void {
    localStorage.removeItem(this.LOCATION_LATITUDE);
    localStorage.removeItem(this.LOCATION_LONGITUDE);
    this.coordinatesSubject.next(null);
    console.log('Coordenadas eliminadas del localStorage');
  }

  // ============= MÉTODOS DE INICIALIZACIÓN =============
  loadInitialCoordinates(): void {
    const storedCoords = this.loadStoredCoordinates();
    if (storedCoords) {
      this.coordinatesSubject.next(storedCoords);
      console.log('Coordenadas iniciales cargadas:', storedCoords);
    } else {
      console.log('No se encontraron coordenadas iniciales en localStorage');
    }
  }

  loadInitialPanorama(): void {
    const storedPanorama = this.getPanoramaForLocationId();
    if (storedPanorama !== null) {
      this.panoramaSubject.next(storedPanorama);
      console.log('Panorama inicial cargado:', storedPanorama);
    } else {
      console.log('No se encontró panorama inicial en localStorage');
    }
  }

  // ============= MÉTODOS PRIVADOS =============
  private loadStoredCoordinates(): { latitude: number; longitude: number } | null {
    try {
      const latStr = localStorage.getItem(this.LOCATION_LATITUDE);
      const lngStr = localStorage.getItem(this.LOCATION_LONGITUDE);

      if (!latStr || !lngStr) {
        return null;
      }

      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      return (!isNaN(lat) && !isNaN(lng)) ? { latitude: lat, longitude: lng } : null;
    } catch (error) {
      console.error('Error al cargar coordenadas del localStorage:', error);
      return null;
    }

  }

}
