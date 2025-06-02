import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy
} from '@angular/core';
import { EndpointService } from '../../../../Services/endpoint/endpoint.service';
import { Location, ApiResponse, User } from '../../../../Model/types';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject,
  map,
  takeUntil,
  catchError
} from 'rxjs';
import { AuthService } from '../../../../Services/auth/auth.service';
import { LocationsService } from '../../../../Services/locations/locations.service';

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

  private destroy$ = new Subject<void>();
  user!: User;

  private stateSubject = new BehaviorSubject<LocationsState>({
    locations: [],
    loading: false,
    error: null
  });

  locationsState$ = this.stateSubject.asObservable();

  locations$ = this.locationsState$.pipe(
    map(state => state.locations)
  );

  loading$ = this.locationsState$.pipe(
    map(state => state.loading)
  );

  error$ = this.locationsState$.pipe(
    map(state => state.error)
  );

  constructor(
    private authService: AuthService,
    private endpointService: EndpointService,
    private locationService: LocationsService,
    private router: Router
  ) {
    this.user = this.authService.currentUserValue!;
    console.log('Usuario actual:', this.user);
  }

  ngOnInit(): void {
    this.user = this.authService.currentUserValue!;
    console.log('Usuario actual:', this.user);

    if (this.user?.company_id) {
      console.log('Componente inicializado');
      this.loadLocations();
    } else {
      console.error('No se pudo obtener el company_id del usuario.');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateState(partialState: Partial<LocationsState>): void {
    const current = this.stateSubject.value;
    const newState = { ...current, ...partialState };
    this.stateSubject.next(newState);
    console.log('Estado actualizado:', newState);
  }

  loadLocations(): void {
    console.log(`Cargando ubicaciones para companyId: ${this.user.company_id}`);
    this.updateState({ loading: true, error: null });

    this.endpointService.getLocationsForCompanyId(this.user.company_id) // 👈 AQUÍ SE USA
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error al obtener ubicaciones:', error);
          this.updateState({
            loading: false,
            error: error.message || 'Error al cargar las ubicaciones'
          });
          return of({ isSucces: false, message: '', data: [], errors: null } as ApiResponse<Location[]>);
        })
      )
      .subscribe((response: ApiResponse<Location[]>) => {
        if (response.isSucces && response.data) {
          this.updateState({
            locations: response.data,
            loading: false,
            error: null
          });
        } else {
          this.updateState({
            locations: [],
            loading: false,
            error: response.message || 'No se pudieron cargar las ubicaciones'
          });
        }
      });
  }


  onLocationClick(location: Location): void {
    console.log('Ubicación seleccionada:', location);
    this.selectedLocationId = location.id;
    this.locationService.setSelectedLocationId(location.id);

    if (location.latitude && location.longitude) {
      this.locationService.setCoordinates(location.latitude, location.longitude);
    }

    this.locationSelected.emit(location);
  }

  onToggleExpanded(): void {
    this.toggle.emit();
  }

  trackByLocationId(index: number, location: Location): number {
    return location.id;
  }

  retryLoad(): void {
    this.loadLocations();
  }
}
