import {Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import * as L from 'leaflet';
import { EndpointService } from "../../Services/endpoint/endpoint.service";
import { Router } from "@angular/router";
import { LocationsService } from "../../Services/locations/locations.service";
import { Subject, takeUntil } from 'rxjs';
import {MarkerService, Panorama} from "../../Services/marker/marker.service";
import {ApiResponse} from "../../Model/types";
import {PopupService} from "../../Services/popup/popup.service";

@Component({
  selector: 'app-map-test',
  templateUrl: './map-test.component.html',
  styleUrls: ['./map-test.component.scss']
})
export class MapTestComponent implements OnInit, OnDestroy, AfterViewInit {
  private map: L.Map | null = null;
  private destroy$ = new Subject<void>();
  private currentMarker: L.Marker | null = null;
  private panoramaLayerGroup: L.LayerGroup | null = null;
  public panoramas: any[] = []; // Cambiado de ApiResponse<any> | null a any[]
  public currentLocationId: number | null = null;

  constructor(
    private locationsService: LocationsService,
    private endpointService: EndpointService,
    private router: Router,
    private markerService: MarkerService,
    private cdr: ChangeDetectorRef,
    private popupService: PopupService
  ) {}

  ngOnInit(): void {
    // Suscribirse a cambios de coordenadas
    this.locationsService.getCoordinatesObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(coords => {
        console.log('Coordenadas recibidas en el mapa:', coords);

        if (coords && this.map) {
          this.updateMapLocation(coords.latitude, coords.longitude);
        }

      });

    // Suscribirse a cambios de panorama
    this.locationsService.getPanoramaObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(locationId => {
        console.log('Cambio de panorama detectado para location:', locationId);
        if (locationId !== null && locationId !== this.currentLocationId) {
          this.currentLocationId = locationId;
          this.loadPanoramasForLocation(locationId);
        }
      });

    // Cargar panoramas iniciales
    this.loadInitialPanoramas();
  }

  ngAfterViewInit(): void {
    this.initMap();
    if (this.currentLocationId) {
      this.loadPanoramasForLocation(this.currentLocationId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.panoramaLayerGroup && this.map) {
      this.map.removeLayer(this.panoramaLayerGroup);
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private loadInitialPanoramas(): void {
    const storedLocationId = this.locationsService.getPanoramaForLocationId();
    if (storedLocationId !== null) {
      this.currentLocationId = storedLocationId;
    }
  }

  private loadPanoramasForLocation(locationId: number): void {
    console.log(`Cargando panoramas para location ID: ${locationId}`);
    this.endpointService.getPanoramas(locationId).subscribe({
      next: (response: ApiResponse<any>) => {
        console.log('Panoramas recibidos:', response);
        // Asegurarse de que tenemos un array de panoramas
        this.panoramas = Array.isArray(response) ? response : (response?.data || []);
        this.cdr.detectChanges();
        this.updatePanoramaMarkers();
      },
      error: (error) => {
        console.error('Error al cargar panoramas:', error);
        this.panoramas = [];
        this.clearPanoramaMarkers();
      }
    });
  }

  private updatePanoramaMarkers(): void {
    console.log('Actualizando marcadores de panorama...');
    if (!this.map) {
      console.warn('Mapa no está inicializado');
      return;
    }

    if (!this.panoramas || this.panoramas.length === 0) {
      console.warn('No hay panoramas para mostrar');
      this.clearPanoramaMarkers();
      return;
    }

    this.clearPanoramaMarkers();
    this.panoramaLayerGroup = L.layerGroup();
    let markersAdded = 0;

    this.panoramas.forEach((panorama, index) => {
      console.log(`Procesando panorama ${index + 1}:`, {
        title: panorama.title,
        lat: panorama.latitude,
        lng: panorama.longitude
      });

      if (panorama.latitude !== undefined && panorama.latitude !== null &&
        panorama.longitude !== undefined && panorama.longitude !== null) {

        // Crear objeto con los datos esperados por el PopupService
        const popupData = {
          name: panorama.filename || 'Panorama sin título',
          state: panorama.viewerUrl || 'Estado desconocido',
          population: 'N/A',
          thumbnail: panorama.thumbnail  // <--- Añadir esto
        };

        const marker = L.circleMarker([panorama.latitude, panorama.longitude], {
          radius: 8,
          color: 'rgb(37,127,255)',
          fillColor: 'rgba(239,239,239,0)',
          fillOpacity: 0.1,
          weight: 4,
          opacity: 1
        })
          .bindPopup(this.popupService.makeCapitalPopup(popupData))

          .on('click', () => {
            console.log('Panorama clickeado:', panorama);
          });

        this.panoramaLayerGroup!.addLayer(marker);
        markersAdded++;
      } else {
        console.warn(`Panorama ${index + 1} no tiene coordenadas válidas:`, panorama);
      }
    });

    if (this.panoramaLayerGroup && markersAdded > 0) {
      this.panoramaLayerGroup.addTo(this.map);
      console.log(`Se agregaron ${markersAdded} marcadores de panorama al mapa`);
      this.map.invalidateSize();

      if (markersAdded > 0) {
        this.fitMapToPanoramas();
      }
    } else {
      console.warn('No se pudieron agregar marcadores al mapa');
    }
  }

  private fitMapToPanoramas(): void {
    if (!this.map || !this.panoramas.length) return;

    const validPanoramas = this.panoramas.filter(p => p.latitude && p.longitude);
    if (validPanoramas.length === 0) return;

    if (validPanoramas.length === 1) {
      // Un solo panorama: centrar en él
      const p = validPanoramas[0];
      this.map.setView([p.latitude, p.longitude], 15);
    } else {
      // Múltiples panoramas: ajustar vista para mostrar todos
      const bounds = L.latLngBounds(
        validPanoramas.map(p => [p.latitude, p.longitude])
      );
      this.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  private clearPanoramaMarkers(): void {
    if (this.panoramaLayerGroup && this.map) {
      this.map.removeLayer(this.panoramaLayerGroup);
      this.panoramaLayerGroup = null;
      console.log('Marcadores de panorama limpiados');
    }
  }

  getStoredPanoramas(): void {
    const locationId = this.locationsService.getSelectedLocationId();
    if (locationId !== null) {
      this.loadPanoramasForLocation(locationId);
    }
  }

  onLocationClick(locationId: number): void {
    this.locationsService.setSelectedLocationId(locationId);
    this.locationsService.setPanoramaForLocationId(locationId);
  }

  private initMap(): void {
    const coords = this.getStoredCoordinates();
    const center = coords.isValid ? [coords.lat, coords.lng] : [9.8282, -9.5795];

    if (this.map) {
      this.map.remove();
    }

    console.log('Inicializando mapa con centro:', center);
    this.map = L.map('map', {
      center: center as L.LatLngExpression,
      zoom: coords.isValid ? 12 : 8,
      preferCanvas: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 5,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    if (coords.isValid) {
      this.addMarker(coords.lat, coords.lng);
    }

    this.map.on('zoomend moveend', () => {
      console.log('Mapa actualizado - Zoom:', this.map?.getZoom(), 'Centro:', this.map?.getCenter());
    });

    console.log('Mapa inicializado correctamente');
  }

  private getStoredCoordinates(): { lat: number; lng: number; isValid: boolean } {
    const storedCoords = this.locationsService.getCoordinates();

    if (storedCoords) {
      return {
        lat: storedCoords.latitude,
        lng: storedCoords.longitude,
        isValid: true
      };
    }

    return { lat: 0, lng: 0, isValid: false };
  }

  private updateMapLocation(lat: number, lng: number): void {
    if (!this.map) return;
    this.map.setView([lat, lng], 12);
    this.addMarker(lat, lng);
  }

  private addMarker(lat: number, lng: number): void {
    if (!this.map) return;

    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }

    this.currentMarker = L.marker([lat, lng])
      .addTo(this.map)
      .bindPopup(`Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      .openPopup();
  }
}
