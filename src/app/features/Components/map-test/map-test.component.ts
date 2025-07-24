import {AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import * as L from "leaflet";
import {Subject, takeUntil} from "rxjs";
import {LocationsService} from "../../Services/locations/locations.service";
import {EndpointService} from "../../Services/endpoint/endpoint.service";
import {Router} from "@angular/router";
import {MarkerService} from "../../Services/marker/marker.service";
import {PopupService} from "../../Services/popup/popup.service";
import {ApiResponse, Hotspot, Panorama} from "../../Model/types";
import {LoadingService} from "../../Services/loading/loading.service";
import {finalize} from "rxjs/operators";
import {ApiService} from "../../Services/viewer-360/api/api.service";
import {PanoramaSyncService} from "../../Services/panorama-sync/panorama-sync.service";
import {NavigationTrackerService} from "../../Services/navigation-tracker/navigation-tracker.service";
import {StoredPanoramasService} from "../../Services/viewer-360/storedPanoramas/stored-panoramas.service";
import {HighlightService} from "../../Services/highlight/highlight.service";
import {CsvDataService} from "../../Services/csv-data/csv-data.service";

@Component({
  selector: 'app-map-test',
  templateUrl: './map-test.component.html',
  styleUrls: ['./map-test.component.scss']
})
export class MapTestComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading: boolean = false;
  private csvLayerGroup: L.LayerGroup | null = null;
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
  public allHotspots: Hotspot[] = [];

  constructor(
    private csvDataService: CsvDataService,
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
    private storedPanoramasService: StoredPanoramasService,
    private highlightService: HighlightService
  ) {
    this.router.events.subscribe(event => {
      console.log('[AppComponent] router event:', event);
    });
  }

  ngOnInit(): void {
    console.log('[MapTest ngOnInit] Iniciado');
    this.csvDataService.getCsvData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(csvPayload => {
        console.log('[MapTest] Datos CSV recibidos:', csvPayload);
        if (csvPayload && csvPayload.csvData.length > 0) {
          this.addCsvMarkersToMap(csvPayload.csvData, csvPayload.locationId);
        } else {
          this.clearCsvMarkers();
        }
      });
    this.highlightService.highlighted$
      .pipe(takeUntil(this.destroy$))
      .subscribe(highlightedPanoramas => {
        console.log('[MapTest] Panoramas destacados actualizados:', highlightedPanoramas);

        if (this.currentPanoramaId && highlightedPanoramas.has(this.currentPanoramaId)) {
          console.log('[MapTest] Panorama actual está en los destacados. Actualizando hotspot.');
          this.updateSelectHotspot(this.currentPanoramaId);
        }
      });

    this.panoramaSyncService.getCurrentPanoramaId()
      .pipe(takeUntil(this.destroy$))
      .subscribe(panoramaId => {
        console.log('[MapTest] ID de panorama actual recibido desde panoramaSyncService:', panoramaId);
        this.currentPanoramaId = panoramaId;
        this.updateSelectedMarker(panoramaId);
      });

    this.panoramaSyncService.getMapReinitObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldReinit => {
        const prevUrl = this.navTracker.getPreviousUrl();
        const currentUrl = this.navTracker.getCurrentUrl();

        console.log('[MapTest] Verificando reinicialización del mapa');
        console.log('Previous URL:', prevUrl);
        console.log('Current URL:', currentUrl);
        console.log('Should reinit?', shouldReinit);

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

    this.locationsService.getCoordinatesObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(coords => {
        console.log('[MapTest CoordsObservable] Coordenadas recibidas:', coords);
        if (coords && this.map) {
          console.log('[MapTest] Actualizando ubicación del mapa...');
          this.updateMapLocation(coords.latitude, coords.longitude);
        }
      });

    this.apiService.getAllPanoramas().subscribe({
      next: (res) => {
        this.panoramasApi = res.data;
        console.log('[MapTest] Panoramas cargados desde API:', res.data);
      },
      error: (err) => {
        console.error('[MapTest] Error al cargar panoramas desde API:', err);
      }
    });

    this.locationsService.getPanoramaObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(locationId => {
        console.log('[MapTest PanoramaObservable] Cambio detectado, locationId:', locationId);
        if (locationId !== null && locationId !== this.currentLocationId) {
          console.log(`[MapTest] Nueva ubicación detectada (${locationId}), actualizando...`);
          this.currentLocationId = locationId;
          this.loadPanoramasForLocation(locationId);
        }
      });

    console.log('[MapTest ngOnInit] Cargando panoramas iniciales...');
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
    this.clearCsvMarkers();
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
      console.log('no hay marcadores')
      console.log('[MapTest] Diagnóstico de updatePanoramaMarkers:');
      console.log('this.map:', this.map);
      console.log('this.panoramas:', this.panoramas);
      console.log('this.panoramas.length:', this.panoramas?.length);
      this.clearPanoramaMarkers();
      return;
    }

    this.clearPanoramaMarkers();
    this.panoramaLayerGroup = L.layerGroup();

    const highlightedPanoramas = this.highlightService.getCurrent();
    let markersAdded = 0;

    this.panoramas.forEach((panorama) => {
      if (panorama.latitude && panorama.longitude) {
        const popupData = {
          id: panorama.id,
          address: panorama.address,
          name: panorama.filename || 'Sin nombre',
          thumbnail: panorama.thumbnail || null
        };

        // Determinar el estilo del marcador
        const isSelected = this.currentPanoramaId === panorama.id;
        const hasHotspot = highlightedPanoramas.has(panorama.id);

        let markerStyle;
        if (hasHotspot) {
          // Verde para panoramas con hotspots guardados
          markerStyle = {
            radius: 10,
            color: 'rgb(0,255,60)',
            fillColor: 'rgba(0,255,60,0.3)',
            fillOpacity: 0.5,
            weight: 5,
            opacity: 1
          };
        } else if (isSelected) {
          // Naranja para panorama seleccionado
          markerStyle = {
            radius: 12,
            color: 'rgb(255, 69, 0)',
            fillColor: 'rgba(255, 69, 0, 0.3)',
            fillOpacity: 0.5,
            weight: 6,
            opacity: 1
          };
        } else {
          // Azul para panorama normal
          markerStyle = {
            radius: 8,
            color: 'rgb(37,127,255)',
            fillColor: 'rgba(239,239,239,0)',
            fillOpacity: 0.1,
            weight: 4,
            opacity: 1
          };
        }

        const marker = L.circleMarker([panorama.latitude, panorama.longitude], markerStyle);

        // Guardar referencia del marcador seleccionado
        if (isSelected) {
          this.selectedPanoramaMarker = marker;
        }

        const popupContent = this.popupService.makeCapitalPopup(popupData);
        this.popupService.addHoverBehavior(marker, popupContent);

        marker.on('click', () => {
          console.log(`[MapTest] Marcador clickeado: Cambiando a panorama ${panorama.id}`);
          this.router.navigate(['/vr', panorama.id]);
          this.panoramaSyncService.changePanorama(panorama.id, panorama, 'map');
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
        this.updatePanoramaMarkers();
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

  updateSelectHotspot(panoramaId: number | null): void {
    if (!this.panoramaLayerGroup) return;

    const highlightedPanoramas = this.highlightService.getCurrent();

    // Resetear todos los marcadores al estilo normal
    this.panoramaLayerGroup.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker) {
        const layerLatLng = layer.getLatLng();
        const panoramaForThisLayer = this.panoramas.find(p =>
          Math.abs(layerLatLng.lat - p.latitude) < 0.00001 &&
          Math.abs(layerLatLng.lng - p.longitude) < 0.00001
        );

        if (panoramaForThisLayer && highlightedPanoramas.has(panoramaForThisLayer.id)) {
          // Estilo para panoramas con hotspots guardados (VERDE)
          layer.setStyle({
            radius: 10,
            color: 'rgb(0,255,60)', // Verde para hotspots guardados
            fillColor: 'rgba(0,255,60,0.3)',
            fillOpacity: 0.5,
            weight: 5
          });
        } else if (panoramaForThisLayer && panoramaForThisLayer.id === this.currentPanoramaId) {
          // Estilo para panorama seleccionado actual (NARANJA)
          layer.setStyle({
            radius: 12,
            color: 'rgb(255, 69, 0)',
            fillColor: 'rgba(255, 69, 0, 0.3)',
            fillOpacity: 0.5,
            weight: 6
          });
        } else {
          // Estilo normal (AZUL)
          layer.setStyle({
            radius: 8,
            color: 'rgb(37,127,255)',
            fillColor: 'rgba(239,239,239,0)',
            fillOpacity: 0.1,
            weight: 4
          });
        }
      }
    });
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
      this.map.fitBounds(bounds, {padding: [20, 20]});
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
    return {lat: 0, lng: 0, isValid: false};
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

  private addCsvMarkersToMap(csvLocations: any[], locationId: number): void {
    if (!this.map || !csvLocations.length) {
      console.log('[MapTest] No hay mapa o datos CSV para mostrar');
      return;
    }

    console.log(`[MapTest] Agregando ${csvLocations.length} marcadores CSV para ubicación ${locationId}`);

    // Limpiar marcadores CSV anteriores
    this.clearCsvMarkers();

    // Crear nuevo grupo de capas para CSV
    this.csvLayerGroup = L.layerGroup();

    let markersAdded = 0;

    csvLocations.forEach((location, index) => {
      if (location.latitud && location.longitud) {
        // Crear círculo morado
        const marker = L.circleMarker(
          [location.latitud, location.longitud],
          {
            radius: 8,
            color: '#800080', // Morado
            fillColor: 'rgba(128, 0, 128, 0.3)',
            fillOpacity: 0.6,
            weight: 3,
            opacity: 1
          }
        );

        // Crear popup con información
        const popupContent = this.createCsvPopupContent(location, index);
        marker.bindPopup(popupContent);

        // Hover effect
        marker.on('mouseover', () => {
          marker.setStyle({
            radius: 10,
            weight: 4,
            fillOpacity: 0.8
          });
        });

        marker.on('mouseout', () => {
          marker.setStyle({
            radius: 8,
            weight: 3,
            fillOpacity: 0.6
          });
        });

        this.csvLayerGroup!.addLayer(marker);
        markersAdded++;
      }
    });

    if (markersAdded > 0) {
      // Agregar al mapa
      this.csvLayerGroup.addTo(this.map);
      console.log(`[MapTest] Se agregaron ${markersAdded} marcadores CSV morados`);

      // Opcional: Ajustar vista para incluir los puntos CSV
      // this.fitMapToCsvAndPanoramas();
    }
  }

  private createCsvPopupContent(location: any, index: number): string {
    let content = `<div class="csv-popup">`;
    content += `<h4 style="color: #800080; margin: 0 0 8px 0;">Punto CSV #${index + 1}</h4>`;
    content += `<p><strong>Lat:</strong> ${location.latitud?.toFixed(6)}</p>`;
    content += `<p><strong>Lng:</strong> ${location.longitud?.toFixed(6)}</p>`;

    // Agregar otros campos disponibles del CSV
    Object.keys(location).forEach(key => {
      if (!['id', 'latitud', 'longitud', 'latitude', 'longitude'].includes(key) && location[key]) {
        const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
        content += `<p><strong>${fieldName}:</strong> ${location[key]}</p>`;
      }
    });

    content += `</div>`;
    return content;
  }

  private clearCsvMarkers(): void {
    if (this.csvLayerGroup && this.map) {
      console.log('[MapTest] Limpiando marcadores CSV');
      this.map.removeLayer(this.csvLayerGroup);
      this.csvLayerGroup = null;
    }
  }

  /**
   * Método público para obtener la instancia del mapa (si lo necesitas)
   */
  public get mapInstance(): L.Map | null {
    return this.map;
  }

  /**
   * Ajustar vista del mapa para incluir tanto panoramas como puntos CSV
   */
  private fitMapToCsvAndPanoramas(): void {
    if (!this.map) return;

    const allPoints: [number, number][] = [];

    // Agregar puntos de panoramas
    const validPanoramas = this.panoramas.filter(p => p.latitude && p.longitude);
    validPanoramas.forEach(p => {
      allPoints.push([p.latitude, p.longitude]);
    });

    // Agregar puntos CSV si existen
    const csvData = this.csvDataService.getCurrentCsvData();
    if (csvData) {
      csvData.csvData.forEach(location => {
        if (location.latitud && location.longitud) {
          allPoints.push([location.latitud, location.longitud]);
        }
      });
    }

    if (allPoints.length === 0) return;

    if (allPoints.length === 1) {
      this.map.setView(allPoints[0], 15);
    } else {
      const bounds = L.latLngBounds(allPoints);
      this.map.fitBounds(bounds, {padding: [20, 20]});
    }
  }
}
