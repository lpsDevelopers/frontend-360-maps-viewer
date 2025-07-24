import {Component, OnInit, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import { trigger, transition, style, animate } from '@angular/animations';
import {VrThreeService} from "../../../Services/viewer-360/vrThree/vr-three.service";
import {FullScreenService} from "../../../Services/viewer-360/fullScreen/full-screen.service";
import {ApiService} from "../../../Services/viewer-360/api/api.service";
import {PanoramaSyncService} from "../../../Services/panorama-sync/panorama-sync.service";
import {Subject, takeUntil} from 'rxjs';
import {NavigationTrackerService} from "../../../Services/navigation-tracker/navigation-tracker.service";
import {GeoUtilsService} from "../../../Services/viewer-360/geoUtilsService/geo-utils-service.service";

@Component({
  selector: 'app-vr',
  templateUrl: './vr.component.html',
  styleUrls: ['./vr.component.scss'],
  animations: [
    trigger('toggleVisibility', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translate(50%, 100%)',
        }),
        animate(
          '100ms ease-out',
          style({ opacity: 1, transform: 'translate(50%, 0)' })
        ),
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('100ms ease-out', style({ opacity: 0 })),
      ]),
    ]),
    trigger('mapSlide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-in-out', style({ transform: 'translateX(0%)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ],
})
export class VrComponent implements OnInit, OnDestroy {

  currentLat: number = 0;
  currentLon: number = 0;
  currentOrientationDeg: number = 0;

  targetLat: number = 0;
  targetLon: number = 0;

  isAhead: boolean = false;

  isVrReady = false;
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipLabel = '';
  controlsInfo = '';
  showMap = true;
  panoramaId: number | null = null
  private destroy$ = new Subject<void>();
  private currentPanoramaId: number | null = null;
  private map: L.Map | null = null;
  private isComponentInitialized: boolean = false;
  constructor(
    private geoUtils: GeoUtilsService,
    private route: ActivatedRoute,
    private router: Router,
    private vrThreeService: VrThreeService,
    public fullScreenService: FullScreenService,
    private apiService: ApiService,
    private panoramaSyncService: PanoramaSyncService,
    private navTracker: NavigationTrackerService,
  ) {}

  ngOnInit(): void {
    this.panoramaSyncService.enterVrContext();
    const previousUrl = this.navTracker.getPreviousUrl();
    console.log('[VrComponent] Ruta anterior:', previousUrl);

    this.panoramaSyncService.getVrReinitObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldReinit => {
        if (shouldReinit) {
          console.log('[VrComponent] Solicitud de reinicialización del VR recibida');
          if (this.panoramaId) {
            this.reinitializeVrViewer(this.panoramaId);
          }
          this.panoramaSyncService.resetVrReinit();
        }
      });


    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params.get('id');
      const newPanoramaId = id ? +id : null;

      console.log('[VrComponent] Parámetro ID cambiado:', newPanoramaId);

      if (newPanoramaId !== null) {
        const isNewPanorama = newPanoramaId !== this.panoramaId;
        this.panoramaId = newPanoramaId;

        // Detectar si venimos desde fuera de /vr/* O si es un panorama diferente
        const isComingFromOutsideVr = !previousUrl.startsWith('/vr');
        const needsFullReinit = !this.isComponentInitialized || isComingFromOutsideVr;

        if (needsFullReinit) {
          console.log('[VrComponent] Entraste desde otra ruta → reinicializar visor');
          this.reinitializeVrViewer(this.panoramaId);
          this.panoramaSyncService.requestMapReinit();
          this.isComponentInitialized = true;
        } else if (isNewPanorama) {
          console.log('[VrComponent] Navegación interna en /vr → cambiar panorama');
          this.loadPanoramaById(this.panoramaId);
        }

        // Siempre notifica al servicio de sincronización
        this.panoramaSyncService.changePanorama(this.panoramaId, null, 'vr');
      }
    });

    console.log('[VR Component] ngOnInit iniciado');

    // Configurar callback de tooltip
    this.vrThreeService.registerTooltipCallback((x: number, y: number, label: string | null) => {
      if (label) {
        this.tooltipX = x;
        this.tooltipY = y;
        this.tooltipLabel = label;
        this.tooltipVisible = true;
      } else {
        this.tooltipVisible = false;
        this.tooltipX = -9999;
        this.tooltipY = -9999;
        this.tooltipLabel = '';
      }
    });

    // Escuchar cambios de panorama desde el mapa
    this.panoramaSyncService.getPanoramaChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe(changeEvent => {
        console.log('[VR Component] Evento panoramaSyncService recibido:', changeEvent);
        if (changeEvent && changeEvent.panoramaId !== this.currentPanoramaId) {
          console.log('[VR Component] Cambio de panorama recibido desde:', changeEvent.source);
          if (changeEvent.source === 'map') {
            this.router.navigate(['/vr', changeEvent.panoramaId]);
          } else {
            this.loadPanoramaById(changeEvent.panoramaId);
          }
        }
      });
    this.vrThreeService.sphereClick$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(({position, cameraOrientation}) => {
      if (!this.panoramaId) return;
      console.log('Click en esfera detectado:', position, cameraOrientation);
      // Buscar próximo panorama según click y orientación actual
      console.log('panoramaId actual en click:', this.panoramaId);
      const nextPanorama = this.geoUtils.findNextPanoramaFromClick(
      this.panoramaId,
        {x: position.x, y: position.y, z: position.z},
        cameraOrientation
      );
      console.log('No hay panorama activo.');
      if (nextPanorama) {
        // Navegar al nuevo panorama y sincronizar
        this.router.navigate(['/vr', nextPanorama.id]);
        this.panoramaSyncService.changePanorama(nextPanorama.id, null, 'vr');
      }
    });

  }
  initPanorama(id: number): void {
    console.log('[VrComponent] Inicializando panorama con ID:', id);

    // Notificamos al servicio
    this.panoramaSyncService.changePanorama(id, null, 'vr');
  }

  initVr( id: number ): void {
    this.panoramaSyncService.changePanorama(id, null, 'vr');
  }

  someMethodWhereYouEvaluateDirection() {
    this.isAhead = this.geoUtils.isPanoramaAhead(
      this.currentLat,
      this.currentLon,
      this.currentOrientationDeg,
      this.targetLat,
      this.targetLon,
      90 // tolerancia angular en grados, puedes ajustar
    );

    if (this.isAhead) {
      console.log('El panorama objetivo está adelante');

    } else {
      console.log('El panorama objetivo está atrás');

    }
  }
  private reinitializeVrViewer(panoramaId: number): void {
    console.log('[VrComponent] Reinicializando visor VR completamente para panorama:', panoramaId);
    this.vrThreeService.resetCurrentPanorama();

    this.vrThreeService.cleanup?.(); // Si tienes un método de limpieza

    // Cargar el nuevo panorama
    this.loadPanoramaById(panoramaId);

    // Resetear estados
    this.currentPanoramaId = panoramaId;

    console.log('[VrComponent] Visor VR reinicializado completamente');
  }

  onBackButtonClick(): void {
    console.log('[VrComponent] Botón de retroceso presionado');

    // Notificar que salimos del contexto VR
    this.panoramaSyncService.exitVrContext();

    // 🚨 Solicitar limpieza del mapa
    this.panoramaSyncService.triggerClearMap();

    // Limpiar estado local
    this.isComponentInitialized = false;
    this.currentPanoramaId = null;

    // Navegar al dashboard
    this.router.navigate(['/']);
  }
  ngOnDestroy(): void {
    console.log('[VR Component] ngOnDestroy - limpiando suscripciones');

    // Notificar que estamos saliendo del contexto VR
    this.panoramaSyncService.exitVrContext();

    this.isComponentInitialized = false;
    this.destroy$.next();
    this.destroy$.complete();
  }



  private loadPanoramaById(panoramaId: number): void {
    console.log('[VR Component] Cargando panorama ID:', panoramaId);

    // Evitar recargar el mismo panorama
    if (this.currentPanoramaId === panoramaId) {
      console.log('[VR Component] Panorama ya cargado, omitiendo recarga');
      return;
    }

    this.currentPanoramaId = panoramaId;

    // (Opcional) Si necesitas el backend para otra lógica
    this.apiService.getPanoramaByIdBackend(panoramaId).subscribe({
      next: () => console.log('[VR Component] getPanoramaByIdBackend llamado correctamente'),
      error: err => console.error('[VR Component] Error en getPanoramaByIdBackend:', err)
    });

    // Cargar la imagen del panorama
    this.apiService.getPanoramaById(panoramaId).subscribe({
      next: (response) => {
        const viewerUrl = response?.data?.thumbnail;
        // Base URL si viewerUrl es relativa
        const baseUrl = 'https://piloto360.s3.amazonaws.com';
        // Asegurarse de que sea una URL completa
        this.apiService.selectedImageUrl = viewerUrl?.startsWith('http')
          ? viewerUrl
          : viewerUrl?.trim()
            ? `${baseUrl}/${viewerUrl}`
            : '/assets/defauuuuuult.jpg';

        console.log('[VR Component] Imagen seleccionada:', this.apiService.selectedImageUrl);

        // MODIFICACIÓN: Pasar panoramaId al actualizar textura
        this.vrThreeService.updatePanoramaTexture(
          this.apiService.selectedImageUrl,
          panoramaId  // <- NUEVO PARÁMETRO
        );

        this.isVrReady = true;
        console.log('[VR Component] Panorama texture actualizada con hotspots específicos');
      },
      error: (error) => {
        console.error('[VR Component] Error al cargar panorama:', error);
        this.apiService.selectedImageUrl = '/assets/default.jpg';
        this.vrThreeService.updatePanoramaTexture(
          this.apiService.selectedImageUrl,
          panoramaId
        );
      }
    });

    this.apiService.getPostesByPanorama(panoramaId).subscribe({

    })
  }

  OnfullScreenService() {
    console.log('[VR Component] OnfullScreenService llamado');
    this.fullScreenService.isFullScreen = true;
  }

  toggleFullScreen() {
    console.log('[VR Component] toggleFullScreen llamado');
    this.fullScreenService.toggleFullScreen();
  }

  // Método para toggle del mapa
  toggleMap() {
    this.showMap = !this.showMap;

    if (this.showMap && this.map) {
      this.fixMapSize();
    }
  }

  private fixMapSize() {
    // Intenta primero con un tiempo corto
    setTimeout(() => {
      this.map!.invalidateSize();

      // Si aún no funciona, intenta nuevamente
      if (!this.isMapDisplayedCorrectly()) {
        setTimeout(() => {
          this.map!.invalidateSize(true);
          this.map!.setView(this.map!.getCenter());
        }, 50);
      }
    }, 10);
  }
  private isMapDisplayedCorrectly(): boolean {
    if (!this.map) return false;
    const container = this.map.getContainer();
    return container.offsetWidth > 0 && container.offsetHeight > 0;
  }
  showControlInfo() {
    if (this.vrThreeService.orbitControlMode) {
      this.controlsInfo = 'Orientation';

      setTimeout(() => {
        this.controlsInfo = '';
      }, 4000);
    } else {
      this.controlsInfo = 'Orbit';
      console.log('[VR Component] showControlInfo: Orbit');
      setTimeout(() => {
        this.controlsInfo = '';
      }, 4000);
    }
  }

  protected readonly FullScreenService = FullScreenService;
}
