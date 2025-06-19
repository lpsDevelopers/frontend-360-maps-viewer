import {AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import * as L from "leaflet";
import {Subject, takeUntil} from "rxjs";
import {LocationsService} from "../../Services/locations/locations.service";
import {EndpointService} from "../../Services/endpoint/endpoint.service";
import {Router} from "@angular/router";
import {MarkerService} from "../../Services/marker/marker.service";
import {PopupService} from "../../Services/popup/popup.service";
import {ApiResponse, Panorama} from "../../Model/types";
import {LoadingService} from "../../Services/loading/loading.service";
import {finalize} from "rxjs/operators";
import {ApiService} from "../../Services/viewer-360/api/api.service";
import {PanoramaSyncService} from "../../Services/panorama-sync/panorama-sync.service";
import {NavigationTrackerService} from "../../Services/navigation-tracker/navigation-tracker.service";
import {StoredPanoramasService} from "../../Services/viewer-360/storedPanoramas/stored-panoramas.service";


@Component({
  selector: 'app-map-test',
  templateUrl: './map-test.component.html',
  styleUrls: ['./map-test.component.scss']
})
export class MapTestComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading: boolean = false;
  private map: L.Map | null = null;
  private destroy$ = new Subject<void>();
  private currentMarker: L.Marker | null = null;
  private panoramaLayerGroup: L.LayerGroup | null = null;
  private selectedPanoramaMarker: L.CircleMarker | null = null; // Nuevo: tracking del marcador seleccionado
  @Input() customStyle: any;
  public panoramas: any[] = [];
  public currentLocationId: number | null = null;
  public panoramasApi: any[] = [];
  public currentPanoramaId: number | null = null; // Nuevo: tracking del panorama actual

  public allPanoramas: Panorama[] = [];


  constructor(
    private locationsService: LocationsService,
    private endpointService: EndpointService,
    private router: Router,
    private markerService: MarkerService,
    private cdr: ChangeDetectorRef,
    private popupService: PopupService,
    private loadingService: LoadingService,
    private apiService: ApiService,
    private panoramaSyncService: PanoramaSyncService,
    private navTracker: NavigationTrackerService,
    private storedPanoramasService: StoredPanoramasService
  ) {
    this.router.events.subscribe(event => {
      console.log('[AppComponent] router event:', event);
    });
  }

  ngOnInit(): void {

    console.log('[MapTest ngOnInit] Iniciado');
    this.panoramaSyncService.getCurrentPanoramaId()
      .pipe(takeUntil(this.destroy$))
      .subscribe(panoramaId => {
        this.currentPanoramaId = panoramaId;
        this.updateSelectedMarker(panoramaId);
      });
   this.panoramaSyncService.getMapReinitObservable()
  .pipe(takeUntil(this.destroy$))
  .subscribe(shouldReinit => {
    const prevUrl = this.navTracker.getPreviousUrl();
    const currentUrl = this.navTracker.getCurrentUrl();

    const isComingFromOtherRoute = prevUrl && prevUrl !== currentUrl && !prevUrl.includes('/vr');

    if (shouldReinit && isComingFromOtherRoute) {
      console.log('[MapTest] Reinicialización permitida: viene de otra ruta');
      setTimeout(() => {
        this.reinitializeMap();
        this.panoramaSyncService.resetMapReinit();
      }, 200);
    } else {

      console.log('[MapTest] Reinicialización ignorada (sin cambio de ruta o viniendo desde VR)');
    }
  });
    // Escuchar cambios del panorama actual desde VR


    // Suscribirse a cambios de coordenadas
    this.locationsService.getCoordinatesObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(coords => {
        console.log('[MapTest CoordsObservable] Coordenadas recibidas:', coords);
        if (coords && this.map) {
          this.updateMapLocation(coords.latitude, coords.longitude);
        }
      });

    // Cargar todos los panoramas
    this.apiService.getAllPanoramas().subscribe({
      next: (res) => {
        this.panoramasApi = res.data;
        console.log('[MapTest] Panoramas cargados:', res);
      },
      error: (err) => {
        console.error('[MapTest] Error al cargar panoramas:', err);
      }
    });

    // Suscribirse a cambios de panorama por ubicación
    this.locationsService.getPanoramaObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(locationId => {
        console.log('[MapTest PanoramaObservable] Cambio de panorama para location:', locationId);
        if (locationId !== null && locationId !== this.currentLocationId) {
          this.currentLocationId = locationId;
          this.loadPanoramasForLocation(locationId);
        }
      });

    this.loadInitialPanoramas();
  }

  private reinitializeMap(): void {
    console.log('[MapTest] Reinicializando mapa completamente...');

    // Destruir el mapa actual si existe
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Limpiar marcadores
    this.clearPanoramaMarkers();

    // Reinicializar el mapa
    this.initMap();

    // Recargar panoramas si tenemos una ubicación actual
    if (this.currentLocationId) {
      this.loadPanoramasForLocation(this.currentLocationId);
    }

    console.log('[MapTest] Mapa reinicializado completamente');
  }


  ngAfterViewInit(): void {
    console.log('[MapTest ngAfterViewInit] Inicializando mapa...');
    this.initMap();
    if (this.currentLocationId) {
      this.loadPanoramasForLocation(this.currentLocationId);
    }
  }

  ngOnDestroy(): void {
    console.log('[MapTest ngOnDestroy] Limpiando recursos');
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
    console.log('[MapTest loadInitialPanoramas] storedLocationId:', storedLocationId);
    if (storedLocationId !== null) {
      this.currentLocationId = storedLocationId;
    }
  }

  private loadPanoramasForLocation(locationId: number): void {
    this.loadingService.show();
    this.endpointService.getPanoramasForLocation(locationId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response: ApiResponse<any>) => {
          if (response && Array.isArray(response.data)) {
            this.panoramas = response.data;
            this.allPanoramas = response.data; // Guardas todos aquí
          } else if (Array.isArray(response)) {
            this.panoramas = response;
            this.allPanoramas = response;
          } else {
            this.panoramas = [];
            this.allPanoramas = [];
          }
          this.cdr.detectChanges();
          this.updatePanoramaMarkers();

          // Opcional: imprimir para verificar

          this.allPanoramas.forEach(pano => {
            console.log(`ID: ${pano.id}, Lat: ${pano.latitude}, Lng: ${pano.longitude}`);
          });
          this.storedPanoramasService.setPanoramas(this.allPanoramas);
        },
        error: (error) => {
          console.error('Error al cargar panoramas:', error);
          this.panoramas = [];
          this.allPanoramas = [];
          this.clearPanoramaMarkers();
        }
      });
  }



  private updatePanoramaMarkers(): void {
    console.log('[MapTest updatePanoramaMarkers] Actualizando marcadores...');
    if (!this.map || !this.panoramas || this.panoramas.length === 0) {
      this.clearPanoramaMarkers();
      return;
    }

    this.clearPanoramaMarkers();
    this.panoramaLayerGroup = L.layerGroup();
    let markersAdded = 0;

    this.panoramas.forEach((panorama) => {
      if (panorama.latitude && panorama.longitude) {
        const popupData = {
          id: panorama.id,
          address: panorama.address,
          name: panorama.filename || 'Sin nombre',
          thumbnail: panorama.thumbnail || null
        };

        // Determinar si este marcador está seleccionado
        const isSelected = this.currentPanoramaId === panorama.id;

        const marker = L.circleMarker([panorama.latitude, panorama.longitude], {
          radius: isSelected ? 12 : 8, // Marcador más grande si está seleccionado
          color: isSelected ? 'rgb(255, 69, 0)' : 'rgb(37,127,255)', // Color diferente si está seleccionado
          fillColor: isSelected ? 'rgba(255, 69, 0, 0.3)' : 'rgba(239,239,239,0)',
          fillOpacity: isSelected ? 0.5 : 0.1,
          weight: isSelected ? 6 : 4, // Borde más grueso si está seleccionado
          opacity: 1
        });

        // Guardar referencia del marcador seleccionado
        if (isSelected) {
          this.selectedPanoramaMarker = marker;
        }

        const popupContent = this.popupService.makeCapitalPopup(popupData);
        this.popupService.addHoverBehavior(marker, popupContent);

        // Configurar evento de click - CAMBIO IMPORTANTE AQUÍ
        marker.on('click', () => {
          console.log(`[MapTest] Marcador clickeado: Cambiando a panorama ${panorama.id}`);
          this.router.navigate(['/vr', panorama.id]);
          // En lugar de navegar, usar el servicio de sync para cambiar la vista VR
          this.panoramaSyncService.changePanorama(panorama.id, panorama, 'map');

          // Actualizar el marcador seleccionado
          this.updateSelectedMarker(panorama.id);
        });

        this.panoramaLayerGroup!.addLayer(marker);
        markersAdded++;
      }
    });

    if (this.panoramaLayerGroup && markersAdded > 0) {
      this.panoramaLayerGroup.addTo(this.map);
      console.log(`[MapTest] Se agregaron ${markersAdded} marcadores`);
      this.map.invalidateSize();
      if (markersAdded > 0) {
        this.fitMapToPanoramas();
      }
    }
  }

  // Nuevo método para actualizar el marcador seleccionado
  private updateSelectedMarker(panoramaId: number | null): void {
    if (!this.panoramaLayerGroup) return;

    // Resetear todos los marcadores al estilo normal
    this.panoramaLayerGroup.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker) {
        layer.setStyle({
          radius: 8,
          color: 'rgb(37,127,255)',
          fillColor: 'rgba(239,239,239,0)',
          fillOpacity: 0.1,
          weight: 4
        });
      }
    });

    // Aplicar estilo especial al marcador seleccionado
    if (panoramaId) {
      const selectedPanorama = this.panoramas.find(p => p.id === panoramaId);
      if (selectedPanorama && selectedPanorama.latitude && selectedPanorama.longitude) {
        this.panoramaLayerGroup.eachLayer((layer: any) => {
          if (layer instanceof L.CircleMarker) {
            const latLng = layer.getLatLng();
            if (Math.abs(latLng.lat - selectedPanorama.latitude) < 0.00001 &&
              Math.abs(latLng.lng - selectedPanorama.longitude) < 0.00001) {
              layer.setStyle({
                radius: 12,
                color: 'rgb(255, 69, 0)',
                fillColor: 'rgba(255, 69, 0, 0.3)',
                fillOpacity: 0.5,
                weight: 6
              });
              this.selectedPanoramaMarker = layer;
            }
          }
        });
      }
    }
  }

  private fitMapToPanoramas(): void {
    console.log('[MapTest fitMapToPanoramas] Ajustando vista...');
    if (!this.map || !this.panoramas.length) return;

    const validPanoramas = this.panoramas.filter(p => p.latitude && p.longitude);
    if (validPanoramas.length === 0) return;

    if (validPanoramas.length === 1) {
      const p = validPanoramas[0];
      this.map.setView([p.latitude, p.longitude], 15);
    } else {
      const bounds = L.latLngBounds(
        validPanoramas.map(p => [p.latitude, p.longitude])
      );
      this.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  private clearPanoramaMarkers(): void {
    if (this.panoramaLayerGroup && this.map) {
      console.log('[MapTest] Eliminando marcadores existentes');
      this.map.removeLayer(this.panoramaLayerGroup);
      this.panoramaLayerGroup = null;
      this.selectedPanoramaMarker = null;
    }
  }

  getStoredPanoramas(): void {
    const locationId = this.locationsService.getSelectedLocationId();
    console.log('[MapTest getStoredPanoramas] locationId:', locationId);
    if (locationId !== null) {
      this.loadPanoramasForLocation(locationId);
    }
  }

  onLocationClick(locationId: number): void {
    console.log('[MapTest onLocationClick] Click en locationId:', locationId);
    this.locationsService.setSelectedLocationId(locationId);
    this.locationsService.setPanoramaForLocationId(locationId);
  }

  // ============= MÉTODOS PARA EL MAPA =============
  private initMap(): void {
    const coords = this.getStoredCoordinates();
    const center = coords.isValid ? [coords.lat, coords.lng] : [9.8282, -9.5795];

    if (this.map) {
      console.log('[MapTest initMap] Removiendo mapa existente');
      this.map.remove();
    }

    console.log('[MapTest initMap] Inicializando mapa con centro:', center);
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
      console.log('[MapTest initMap] Añadiendo marcador inicial');
      this.addMarker(coords.lat, coords.lng);
    }

    this.map.on('zoomend moveend', () => {
      console.log('[MapTest] Zoom:', this.map?.getZoom(), 'Centro:', this.map?.getCenter());
    });
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
    console.log(`[MapTest updateMapLocation] Actualizando a [${lat}, ${lng}]`);
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
