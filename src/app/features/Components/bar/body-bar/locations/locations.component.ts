import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, map, takeUntil, catchError, of } from 'rxjs';

import { EndpointService } from '../../../../Services/endpoint/endpoint.service';
import { AuthService } from '../../../../Services/auth/auth.service';
import { LocationsService } from '../../../../Services/locations/locations.service';
import { Location, ApiResponse, UserEmailToken, User } from '../../../../Model/types';

interface LocationsState {
  locations: Location[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-locations',
  templateUrl: './locations.component.html',
  styleUrls: ['./locations.component.scss']
})
export class LocationsComponent implements OnInit, OnDestroy {
  @Input() isExpanded: boolean = true;
  @Output() toggle = new EventEmitter<void>();
  @Output() locationSelected = new EventEmitter<Location>();

  selectedLocationId: number | null = null;
  isLocationClicked = false;
  // Reactive state management
  private readonly destroy$ = new Subject<void>();
  private readonly stateSubject = new BehaviorSubject<LocationsState>({
    locations: [],
    loading: false,
    error: null
  });

  // Public observables
  readonly locationsState$ = this.stateSubject.asObservable();
  readonly locations$ = this.locationsState$.pipe(
    map(state => state.locations)
  );
  readonly loading$ = this.locationsState$.pipe(
    map(state => state.loading)
  );
  readonly error$ = this.locationsState$.pipe(
    map(state => state.error)
  );

  // Current user data
  private user: UserEmailToken;
  private fullUser: User | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly endpointService: EndpointService,
    private readonly locationService: LocationsService,
    private readonly router: Router
  ) {
    this.user = this.authService.currentUserValue!;
    console.log('Usuario actual:', this.user);
  }

  ngOnInit(): void {
    const savedLocations = this.getLocations();
    if (savedLocations && savedLocations.length > 0) {
      this.updateState({ locations: savedLocations, loading: false, error: null });

      // Recuperar la ubicación seleccionada guardada
      this.selectedLocationId = this.getSelectedLocationId();

      // Si tienes la ubicación seleccionada, cargar sus detalles
      if (this.selectedLocationId) {
        const selectedLocation = savedLocations.find(loc => loc.id === this.selectedLocationId);
        if (selectedLocation) {
          this.locationService.setSelectedLocationId(this.selectedLocationId);
          if (selectedLocation.latitude && selectedLocation.longitude) {
            this.locationService.setCoordinates(selectedLocation.latitude, selectedLocation.longitude);
          }
          this.locationService.setPanoramaForLocationId(this.selectedLocationId);
          this.locationSelected.emit(selectedLocation);
        }
      }
    }

    this.subscribeToUserChanges();
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLocationClick(location: Location): void {
    if (this.selectedLocationId === location.id) {
      return; // No hacer nada si ya está seleccionado
    }

    this.selectedLocationId = location.id;
    this.setSelectedLocationId(location.id); // Guardar en localStorage

    this.locationService.setSelectedLocationId(location.id);

    if (location.latitude && location.longitude) {
      this.locationService.setCoordinates(location.latitude, location.longitude);
    }
    this.locationService.setPanoramaForLocationId(location.id);
    this.locationSelected.emit(location);
  }

  onToggleExpanded(): void {
    this.toggle.emit();
  }

  trackByLocationId(index: number, location: Location): number {
    return location.id;
  }

  retryLoad(): void {
    if (this.fullUser?.companyId) {
      this.loadLocations(this.fullUser.companyId);
    } else {
      console.warn('No se puede volver a cargar: usuario o companyId no disponible');
    }
  }

  private subscribeToUserChanges(): void {
    this.authService.fullUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.fullUser = user;
          console.log('Usuario completo recibido:', user);

          if (user?.companyId) {
            this.loadLocations(user.companyId);
          } else {

            console.warn('No hay companyId en usuario');
          }
        },
        error: (error) => {
          console.error('Error al obtener usuario completo:', error);
          this.updateState({
            error: 'Error al cargar información del usuario',
            loading: false
          });
        }
      });
  }

  private loadLocations(companyId: number): void {
    this.updateState({ loading: true, error: null });

    this.endpointService.getLocationsForCompanyId(companyId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error al cargar ubicaciones:', error);
          this.updateState({
            error: 'Error al cargar ubicaciones',
            loading: false
          });
          return of({ data: [] } as unknown as ApiResponse<Location[]>);
        })
      )
      .subscribe({
        next: (response: ApiResponse<Location[]>) => {
          console.log('Respuesta del servidor:', response);
          this.updateState({
            locations: response.data || [],
            loading: false,
            error: null
          });

          // Guardar en localStorage para persistencia
          this.setLocations(response.data || []);

          console.log('Ubicaciones cargadas:', response.data);
        }
      });
  }
  setSelectedLocationId(id: number | null): void {
    if (id === null) {
      localStorage.removeItem('selectedLocationId');
    } else {
      localStorage.setItem('selectedLocationId', id.toString());
    }
  }

  getSelectedLocationId(): number | null {
    const stored = localStorage.getItem('selectedLocationId');
    return stored ? +stored : null;
  }
  private updateState(partialState: Partial<LocationsState>): void {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...partialState };
    this.stateSubject.next(newState);
    console.log('Estado actualizado:', newState);
  }

  setLocations(locations: Location[]): void {
    localStorage.setItem('locations', JSON.stringify(locations));
  }

  getLocations(): Location[] | null {
    const stored = localStorage.getItem('locations');
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
