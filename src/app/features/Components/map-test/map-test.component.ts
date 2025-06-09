import {AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import * as L from "leaflet";
import {Subject, takeUntil} from "rxjs";
import {LocationsService} from "../../Services/locations/locations.service";
import {EndpointService} from "../../Services/endpoint/endpoint.service";
import {Router} from "@angular/router";
import {MarkerService} from "../../Services/marker/marker.service";
import {PopupService} from "../../Services/popup/popup.service";
import {ApiResponse} from "../../Model/types";

@Component({
  selector: 'app-map-test',
  templateUrl: './map-test.component.html',
  styleUrls: ['./map-test.component.scss']
})
export class MapTestComponent implements OnInit, AfterViewInit, OnDestroy {

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
    console.log('[ngOnInit] Iniciado');

    // Suscribirse a cambios de coordenadas
    this.locationsService.getCoordinatesObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(coords => {
        console.log('[CoordsObservable] Coordenadas recibidas en el mapa:', coords);

        if (coords && this.map) {
          this.updateMapLocation(coords.latitude, coords.longitude);
        } else {
          console.warn('[CoordsObservable] Coordenadas recibidas pero el mapa no está inicializado');
        }
      });

    // Suscribirse a cambios de panorama
    this.locationsService.getPanoramaObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(locationId => {
        console.log('[PanoramaObservable] Cambio de panorama detectado para location:', locationId);
        if (locationId !== null && locationId !== this.currentLocationId) {
          this.currentLocationId = locationId;
          this.loadPanoramasForLocation(locationId);
        } else {
          console.warn('[PanoramaObservable] locationId es nulo o igual al actual');
        }
      });

    // Cargar panoramas iniciales
    this.loadInitialPanoramas();
  }

  ngAfterViewInit(): void {
    console.log('[ngAfterViewInit] Inicializando mapa...');
    this.initMap();
    if (this.currentLocationId) {
      console.log('[ngAfterViewInit] Cargando panoramas para currentLocationId:', this.currentLocationId);
      this.loadPanoramasForLocation(this.currentLocationId);
    } else {
      console.warn('[ngAfterViewInit] currentLocationId no está definido');
    }
  }

  ngOnDestroy(): void {
    console.log('[ngOnDestroy] Limpiando subscripciones y recursos');
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
    console.log('[loadInitialPanoramas] storedLocationId:', storedLocationId);
    if (storedLocationId !== null) {
      this.currentLocationId = storedLocationId;
    }
  }

  private loadPanoramasForLocation(locationId: number): void {
    console.log(`[loadPanoramasForLocation] Cargando panoramas para location ID: ${locationId}`);
    this.endpointService.getPanoramasForLocation(locationId).subscribe({
      next: (response: ApiResponse<any>) => {
        console.log('[loadPanoramasForLocation] Panoramas recibidos:', response);

        if (Array.isArray(response)) {
          this.panoramas = response;
        } else if (response && Array.isArray(response.data)) {
          this.panoramas = response.data;
        } else {
          console.warn('[loadPanoramasForLocation] Respuesta inesperada del endpoint:', response);
          this.panoramas = [];
        }
        console.log('[loadPanoramasForLocation] panoramas procesados:', this.panoramas);
        this.cdr.detectChanges();
        this.updatePanoramaMarkers();
      },
      error: (error) => {
        console.error('[loadPanoramasForLocation] Error al cargar panoramas:', error);
        this.panoramas = [];
        this.clearPanoramaMarkers();
      }
    });
  }

  private updatePanoramaMarkers(): void {
    console.log('[updatePanoramaMarkers] Actualizando marcadores de panorama...');
    if (!this.map) {
      console.warn('[updatePanoramaMarkers] Mapa no está inicializado');
      return;
    }

    if (!this.panoramas || this.panoramas.length === 0) {
      console.warn('[updatePanoramaMarkers] No hay panoramas para mostrar');
      this.clearPanoramaMarkers();
      return;
    }

    this.clearPanoramaMarkers();
    this.panoramaLayerGroup = L.layerGroup();
    let markersAdded = 0;

    this.panoramas.forEach((panorama) => {
      if (panorama.latitude && panorama.longitude) {
        console.log(`[updatePanoramaMarkers] Añadiendo marcador para panorama ID: ${panorama.id} en [${panorama.latitude}, ${panorama.longitude}]`);

        const popupData = {
          id: panorama.id,
          name: panorama.filename || 'Sin nombre',
          thumbnail: panorama.thumbnail || null
        };

        const marker = L.circleMarker([panorama.latitude, panorama.longitude], {
          radius: 3,
          color: 'rgb(37,127,255)',
          fillColor: 'rgba(239,239,239,0)',
          fillOpacity: 0.1,
          weight: 4,
          opacity: 1
        })
          .bindPopup(this.popupService.makeCapitalPopup(popupData))
          .on('click', () => {
            console.log(`[updatePanoramaMarkers] Marcador clickeado: Navegando a /viewer/${panorama.id}`);
            this.router.navigate(['/viewer', panorama.id]);
          });

        this.panoramaLayerGroup!.addLayer(marker);
        markersAdded++;
      } else {
        console.warn('[updatePanoramaMarkers] Panorama sin coordenadas válidas:', panorama);
      }
    });

    if (this.panoramaLayerGroup && markersAdded > 0) {
      this.panoramaLayerGroup.addTo(this.map);
      console.log(`[updatePanoramaMarkers] Se agregaron ${markersAdded} marcadores de panorama al mapa`);
      this.map.invalidateSize();

      if (markersAdded > 0) {
        this.fitMapToPanoramas();
      }
    } else {
      console.warn('[updatePanoramaMarkers] No se pudieron agregar marcadores al mapa');
    }
  }

  private fitMapToPanoramas(): void {
    console.log('[fitMapToPanoramas] Ajustando vista del mapa a panoramas...');
    if (!this.map || !this.panoramas.length) {
      console.warn('[fitMapToPanoramas] Mapa no inicializado o no hay panoramas');
      return;
    }

    const validPanoramas = this.panoramas.filter(p => p.latitude && p.longitude);
    if (validPanoramas.length === 0) {
      console.warn('[fitMapToPanoramas] No hay panoramas con coordenadas válidas');
      return;
    }

    if (validPanoramas.length === 1) {
      const p = validPanoramas[0];
      console.log(`[fitMapToPanoramas] Centrar mapa en panorama único: [${p.latitude}, ${p.longitude}] con zoom 15`);
      this.map.setView([p.latitude, p.longitude], 15);
    } else {
      const bounds = L.latLngBounds(
        validPanoramas.map(p => [p.latitude, p.longitude])
      );
      console.log('[fitMapToPanoramas] Ajustando límites del mapa a múltiples panoramas:', bounds);
      this.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  private clearPanoramaMarkers(): void {
    if (this.panoramaLayerGroup && this.map) {
      console.log('[clearPanoramaMarkers] Eliminando marcadores de panorama existentes');
      this.map.removeLayer(this.panoramaLayerGroup);
      this.panoramaLayerGroup = null;
    } else {
      console.log('[clearPanoramaMarkers] No hay marcadores para limpiar');
    }
  }

  getStoredPanoramas(): void {
    const locationId = this.locationsService.getSelectedLocationId();
    console.log('[getStoredPanoramas] locationId seleccionado:', locationId);
    if (locationId !== null) {
      this.loadPanoramasForLocation(locationId);
    }
  }

  onLocationClick(locationId: number): void {
    console.log('[onLocationClick] Click en locationId:', locationId);
    this.locationsService.setSelectedLocationId(locationId);
    this.locationsService.setPanoramaForLocationId(locationId);
  }

  private initMap(): void {
    const coords = this.getStoredCoordinates();
    const center = coords.isValid ? [coords.lat, coords.lng] : [9.8282, -9.5795];

    if (this.map) {
      console.log('[initMap] Mapa ya existe, removiéndolo antes de crear nuevo');
      this.map.remove();
    }

    console.log('[initMap] Inicializando mapa con centro:', center);
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
      console.log('[initMap] Añadiendo marcador inicial en:', coords);
      this.addMarker(coords.lat, coords.lng);
    } else {
      console.warn('[initMap] Coordenadas no válidas, no se añade marcador inicial');
    }

    this.map.on('zoomend moveend', () => {
      console.log('[map event] Zoom:', this.map?.getZoom(), 'Centro:', this.map?.getCenter());
    });

    console.log('[initMap] Mapa inicializado correctamente');
  }

  private getStoredCoordinates(): { lat: number; lng: number; isValid: boolean } {
    const storedCoords = this.locationsService.getCoordinates();
    console.log('[getStoredCoordinates] Coordenadas almacenadas:', storedCoords);

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
    if (!this.map) {
      console.warn('[updateMapLocation] Mapa no inicializado');
      return;
    }
    console.log(`[updateMapLocation] Actualizando vista a [${lat}, ${lng}] con zoom 12`);
    this.map.setView([lat, lng], 12);
    this.addMarker(lat, lng);
  }

  private addMarker(lat: number, lng: number): void {
    if (!this.map) {
      console.warn('[addMarker] Mapa no inicializado');
      return;
    }

    if (this.currentMarker) {
      console.log('[addMarker] Eliminando marcador anterior');
      this.map.removeLayer(this.currentMarker);
    }

    console.log(`[addMarker] Añadiendo marcador en [${lat}, ${lng}]`);
    this.currentMarker = L.marker([lat, lng])
      .addTo(this.map)
      .bindPopup(`Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      .openPopup();
  }

}
