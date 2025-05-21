
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { EndpointService } from "../../Services/endpoint/endpoint.service";
import { Router } from "@angular/router";
import { LocationsService } from "../../Services/locations/locations.service";
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  private map: L.Map | null = null;
  private destroy$ = new Subject<void>();
  private currentMarker: L.Marker | null = null;

  constructor(
    private locationsService: LocationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // SUSCRIBIRSE A CAMBIOS DE COORDENADAS - ESTO ES LO QUE FALTABA
    this.locationsService.getCoordinatesObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(coords => {
        console.log('Coordenadas recibidas en el mapa:', coords);
        if (coords && this.map) {
          this.updateMapLocation(coords.latitude, coords.longitude);
        }
      });
  }

  ngAfterViewInit(): void {
    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  onLocationClick(locationId: string): void {
    this.locationsService.setSelectedLocationId(locationId);
  }

  private initMap(): void {
    const coords = this.getStoredCoordinates();
    const center = coords.isValid ? [coords.lat, coords.lng] : [39.8282, -98.5795];

    if (this.map) {
      this.map.remove();
    }

    console.log("Inicializando mapa con center:", center);

    try {
      this.map = L.map('map', {
        center: center as L.LatLngExpression,
        zoom: 8
      });

      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 5,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        updateWhenIdle: true,
        keepBuffer: 2
      });

      tiles.addTo(this.map);

      // Agregar marcador inicial si hay coordenadas válidas
      if (coords.isValid) {
        this.addMarker(coords.lat, coords.lng);
      }

      // Cargar coordenadas stored al inicializar el servicio
      this.locationsService.loadInitialCoordinates();

    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
    }
  }

  private getStoredCoordinates(): { lat: number; lng: number; isValid: boolean } {
    try {
      const latStr = localStorage.getItem('locationLatitude') || '';
      const lngStr = localStorage.getItem('locationLongitude') || '';

      if (!latStr || !lngStr) {
        return { lat: 0, lng: 0, isValid: false };
      }

      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      const isValid = !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180;

      return { lat, lng, isValid };
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      return { lat:0, lng: 0, isValid: false };
    }
  }

  // MÉTODO NUEVO - Actualizar ubicación del mapa dinámicamente
  private updateMapLocation(latitude: number, longitude: number): void {
    if (!this.map) return;

    console.log(`Actualizando mapa a: ${latitude}, ${longitude}`);

    // Centrar el mapa en las nuevas coordenadas
    this.map.setView([latitude, longitude], 12);

    // Actualizar marcador
    this.addMarker(latitude, longitude);
  }

  private addMarker(lat: number, lng: number): void {
    if (!this.map) return;

    // Remover marcador anterior si existe
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }

    // Crear nuevo marcador
    this.currentMarker = L.marker([lat, lng])
      .addTo(this.map)
      .bindPopup(`Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      .openPopup();
  }
}


