// ============= LOCATIONS COMPONENT CORREGIDO =============
import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { EndpointService } from '../../../../Services/endpoint/endpoint.service';
import { Location } from '../../../../Model/types';
import { Router } from '@angular/router';
import { LocationsService } from "../../../../Services/locations/locations.service";
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-locations',
  templateUrl: './locations.component.html',
  styleUrls: ['./locations.component.scss']
})
export class LocationsComponent implements OnInit, OnDestroy {
  @Input() isExpanded: boolean = true;
  @Output() toggle = new EventEmitter<void>();

  locations: Location[] = [];
  loading: boolean = true;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private locationsService: LocationsService,
    private endpointService: EndpointService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLocations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLocations(): void {
    this.loading = true;
    this.error = null;

    this.endpointService.getLocations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log("Respuesta de la API:", res);
          this.locations = res;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al obtener las ubicaciones:', err);
          this.error = 'No se pudieron cargar las ubicaciones';
          this.loading = false;
        }
      });
  }
  selectedLocationId: string | null = null;

  onMenuItemClick(location: Location): void {
    if (this.selectedLocationId === location.id) {
      // Ya está seleccionado, no hacer nada
      return;
    }

    // Cambia la selección al nuevo elemento
    this.selectedLocationId = location.id;

    // Ejecuta las acciones necesarias
    this.onPanoramaClick(location.id);
    this.onCoordinatesClick(location.latitude, location.longitude);
  }
  onPanoramaClick(locationid: string): void {
    this.locationsService.setPanoramaForLocationId(locationid);

  }

  onLocationClick(locationId: string): void {
    console.log(`Se ha hecho clic en la ubicación con ID: ${locationId}`);
    this.locationsService.setSelectedLocationId(locationId);
    this.locationsService.setPanoramaForLocationId(locationId);
    this.router.navigate(['/map', locationId]).then(success => {
        console.log("Navegación exitosa a /map", success);
    }).catch(error => {
      console.error("Error en la navegación:", error);
    });
  }

  // MÉTODO CORREGIDO - Este es el que debes usar para las coordenadas
  onCoordinatesClick(locationLatitude: number, locationLongitude: number): void {
    console.log(`Coordenadas seleccionadas - Lat: ${locationLatitude}, Lng: ${locationLongitude}`);

    // Usar el servicio para propagar el cambio automáticamente
    this.locationsService.setCoordinates(locationLatitude, locationLongitude);

    // Si necesitas navegar al mapa también
    // this.router.navigate(['/map']);
  }

  // Método de prueba corregido
  onCoordinatesTest(lat: number, lng: number): void {
    // ERROR CORREGIDO: Antes tenías (lt, lt) - ahora es (lat, lng)
    this.locationsService.setCoordinates(lat, lng);
  }
}
