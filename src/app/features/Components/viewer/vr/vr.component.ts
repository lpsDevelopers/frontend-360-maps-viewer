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
import {PanoramaLevelerService} from "../../../Services/panorama-leveler/panorama-leveler.service";

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
  panoramaId: number | null = null;

  // PROPIEDADES PARA NIVELACIÓN
  showLevelerInfo = false;
  currentLevelAngle = 0;
  isLevelerActive = false;



  private destroy$ = new Subject<void>();
  public currentPanoramaId: number | null = null;
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
    private levelerService: PanoramaLevelerService,
  ) {}

  ngOnInit(): void {
    this.panoramaSyncService.enterVrContext();
    const previousUrl = this.navTracker.getPreviousUrl();
    console.log('[VrComponent] Ruta anterior:', previousUrl);

    // SUSCRIPCIÓN: Escuchar cambios del nivelador
    this.setupLevelerSubscriptions();

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

      const nextPanorama = this.geoUtils.findNextPanoramaFromClick(
        this.panoramaId,
        {x: position.x, y: position.y, z: position.z},
        cameraOrientation
      );

      if (nextPanorama) {
        this.router.navigate(['/vr', nextPanorama.id]);
        this.panoramaSyncService.changePanorama(nextPanorama.id, null, 'vr');
      }
    });

    // ❌ ELIMINADO: this.setupKeyboardShortcuts(); - Ya no se usa
  }

  // MÉTODO: Configurar suscripciones del nivelador (Solo con botones)
  private setupLevelerSubscriptions(): void {
    // Suscribirse al estado activo del nivelador
    this.levelerService.levelerActive$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(active => {
      this.isLevelerActive = active;
      console.log(`🎚️ Nivelador ${active ? 'activado' : 'desactivado'}`);
    });

    // Suscribirse a cambios de nivel
    this.levelerService.currentLevel$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(levelData => {
      if (levelData) {
        this.currentLevelAngle = levelData.rollAngle;
      }
    });

    // Suscribirse a cambios de nivel desde VR Service
    this.vrThreeService.horizonLevel$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(angle => {
      this.currentLevelAngle = angle;
    });
  }

  // ========== MÉTODOS DE CONTROL DE NIVELACIÓN CON BOTONES ==========

  // Rotar izquierda
  rotateLeft(): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }
    this.vrThreeService.rotateLeft(1);
    this.showTemporaryMessage('Rotado izquierda -1°');
  }

  // Rotar derecha
  rotateRight(): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }
    this.vrThreeService.rotateRight(1);
    this.showTemporaryMessage('Rotado derecha +1°');
  }

  // Rotación fina izquierda
  rotateFineLeft(): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }
    this.vrThreeService.adjustFineLevel(-0.1);
    this.showTemporaryMessage('Ajuste fino izquierda -0.1°');
  }

  // Rotación fina derecha
  rotateFineRight(): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }
    this.vrThreeService.adjustFineLevel(0.1);
    this.showTemporaryMessage('Ajuste fino derecha +0.1°');
  }

  // Aplicar preset de nivelación
  applyPreset(degrees: number): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }
    this.vrThreeService.setHorizonLevel(degrees);
    this.showTemporaryMessage(`Preset aplicado: ${degrees}°`);
  }

  // Toggle del nivelador
  toggleLeveler(): void {
    const newState = !this.isLevelerActive;

    // Cambiar estado en ambos servicios
    this.levelerService.toggleLeveler(newState);
    this.vrThreeService.toggleHorizonLevelMode(newState);

    // Actualizar estado local
    this.isLevelerActive = newState;

    // Mostrar mensaje informativo
    if (this.isLevelerActive) {
      this.controlsInfo = 'Modo Nivelación Activado - Use los botones para controlar';
    } else {
      this.controlsInfo = 'Nivelador desactivado';
    }

    console.log('🎚️ Nivelador toggled:', this.isLevelerActive);

    // Limpiar mensaje después de unos segundos
    setTimeout(() => {
      if (this.controlsInfo.includes('Nivelador') || this.controlsInfo.includes('Modo Nivelación')) {
        this.controlsInfo = '';
      }
    }, 3000);
  }

  // Toggle información del nivelador
  toggleLevelerInfo(): void {
    this.showLevelerInfo = !this.showLevelerInfo;
  }

  // Resetear nivelación con botón
  async resetLevelingButton(): Promise<void> {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }

    if (!this.currentPanoramaId) {
      this.showTemporaryMessage('No hay panorama activo', 'error');
      return;
    }

    try {
      await this.vrThreeService.resetCurrentLeveling();
      await this.levelerService.resetLevel(this.currentPanoramaId);
      this.currentLevelAngle = 0;

      console.log('🔄 Nivelación reseteada completamente');
      this.showTemporaryMessage('Nivelación reseteada a 0°');
    } catch (error) {
      console.error('Error reseteando nivelación:', error);
      this.showTemporaryMessage('Error al resetear', 'error');
    }
  }

  // Guardar nivelación con botón
  async saveLevelingButton(): Promise<void> {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }

    if (!this.currentPanoramaId) {
      this.showTemporaryMessage('No hay panorama activo', 'error');
      return;
    }

    try {
      const currentLevels = this.vrThreeService.getCurrentLevels();

      await this.levelerService.saveLevelData({
        panoramaId: this.currentPanoramaId,
        rollAngle: currentLevels.roll,
        pitchAngle: currentLevels.pitch,
        yawAngle: currentLevels.yaw
      });

      console.log('Nivelación guardada:', currentLevels);
      this.showTemporaryMessage(`Guardado: ${currentLevels.roll.toFixed(1)}°`);
    } catch (error) {
      console.error('Error guardando nivelación:', error);
      this.showTemporaryMessage('Error al guardar', 'error');
    }
  }

  // Exportar datos de nivelación
  exportLevelingData(): void {
    const data = this.levelerService.exportLevelData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `panorama-leveling-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('Datos de nivelación exportados');
    this.showTemporaryMessage('Configuración exportada');
  }

  // ========== MÉTODOS AUXILIARES ==========

  getCurrentLevelAngle(): number {
    return this.vrThreeService.getCurrentHorizonLevel();
  }

  private showTemporaryMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.controlsInfo = message;
    setTimeout(() => {
      this.controlsInfo = '';
    }, 3000);
  }

  // ========== MÉTODOS EXISTENTES (sin cambios) ==========

  initPanorama(id: number): void {
    console.log('[VrComponent] Inicializando panorama con ID:', id);
    this.panoramaSyncService.changePanorama(id, null, 'vr');
  }

  initVr(id: number): void {
    this.panoramaSyncService.changePanorama(id, null, 'vr');
  }

  someMethodWhereYouEvaluateDirection() {
    this.isAhead = this.geoUtils.isPanoramaAhead(
      this.currentLat,
      this.currentLon,
      this.currentOrientationDeg,
      this.targetLat,
      this.targetLon,
      90
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
    this.vrThreeService.cleanup?.();
    this.loadPanoramaById(panoramaId);
    this.currentPanoramaId = panoramaId;
    console.log('[VrComponent] Visor VR reinicializado completamente');
  }

  onBackButtonClick(): void {
    console.log('[VrComponent] Botón de retroceso presionado');
    this.panoramaSyncService.exitVrContext();
    this.panoramaSyncService.triggerClearMap();
    this.levelerService.toggleLeveler(false);
    this.isComponentInitialized = false;
    this.currentPanoramaId = null;
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    console.log('[VR Component] ngOnDestroy - limpiando suscripciones');
    this.panoramaSyncService.exitVrContext();
    this.levelerService.toggleLeveler(false);
    this.isComponentInitialized = false;
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPanoramaById(panoramaId: number): void {
    console.log('[VR Component] Cargando panorama ID:', panoramaId);

    if (this.currentPanoramaId === panoramaId) {
      console.log('[VR Component] Panorama ya cargado, omitiendo recarga');
      return;
    }

    this.currentPanoramaId = panoramaId;

    this.apiService.getPanoramaByIdBackend(panoramaId).subscribe({
      next: () => console.log('[VR Component] getPanoramaByIdBackend llamado correctamente'),
      error: err => console.error('[VR Component] Error en getPanoramaByIdBackend:', err)
    });

    this.apiService.getPanoramaById(panoramaId).subscribe({
      next: (response) => {
        const viewerUrl = response?.data?.thumbnail;
        const baseUrl = 'https://piloto360.s3.amazonaws.com';

        this.apiService.selectedImageUrl = viewerUrl?.startsWith('http')
          ? viewerUrl
          : viewerUrl?.trim()
            ? `${baseUrl}/${viewerUrl}`
            : '/assets/defauuuuuult.jpg';

        console.log('[VR Component] Imagen seleccionada:', this.apiService.selectedImageUrl);

        this.vrThreeService.updatePanoramaTexture(
          this.apiService.selectedImageUrl,
          panoramaId
        );

        this.isVrReady = true;
        console.log('[VR Component] Panorama texture actualizada con hotspots y nivelación específicos');
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
      // Manejo de hotspots si es necesario
    });
  }

  OnfullScreenService() {
    console.log('[VR Component] OnfullScreenService llamado');
    this.fullScreenService.isFullScreen = true;
  }

  toggleFullScreen() {
    console.log('[VR Component] toggleFullScreen llamado');
    this.fullScreenService.toggleFullScreen();
  }

  toggleMap() {
    this.showMap = !this.showMap;
    if (this.showMap && this.map) {
      this.fixMapSize();
    }
  }

  private fixMapSize() {
    setTimeout(() => {
      this.map!.invalidateSize();
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

  // ========== GETTERS PARA EL TEMPLATE ==========
  get levelStatus() {
    if (this.isLevelerActive) {
      return {
        class: 'level-active',
        text: 'Nivelador Activo'
      };
    }
    return {
      class: 'level-inactive',
      text: 'Nivelador Inactivo'
    };
  }

  rotateUp(): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }

    const currentLevels = this.vrThreeService.getCurrentLevels();
    const newPitch = Math.max(-30, Math.min(30, currentLevels.pitch + 1));

    this.vrThreeService.setAllLevels(
      currentLevels.roll,
      newPitch,
      currentLevels.yaw
    );

    this.showTemporaryMessage(`Pitch arriba: ${newPitch.toFixed(1)}°`);
  }

// Rotar abajo (pitch negativo)
  rotateDown(): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }

    const currentLevels = this.vrThreeService.getCurrentLevels();
    const newPitch = Math.max(-30, Math.min(30, currentLevels.pitch - 1));

    this.vrThreeService.setAllLevels(
      currentLevels.roll,
      newPitch,
      currentLevels.yaw
    );

    this.showTemporaryMessage(`Pitch abajo: ${newPitch.toFixed(1)}°`);
  }

// Rotar yaw izquierda
  rotateYawLeft(): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }

    const currentLevels = this.vrThreeService.getCurrentLevels();
    let newYaw = currentLevels.yaw - 1;

    // Mantener yaw entre -180 y 180
    if (newYaw < -180) newYaw = 180;

    this.vrThreeService.setAllLevels(
      currentLevels.roll,
      currentLevels.pitch,
      newYaw
    );

    this.showTemporaryMessage(`Yaw izquierda: ${newYaw.toFixed(1)}°`);
  }

// Rotar yaw derecha
  rotateYawRight(): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }

    const currentLevels = this.vrThreeService.getCurrentLevels();
    let newYaw = currentLevels.yaw + 1;

    // Mantener yaw entre -180 y 180
    if (newYaw > 180) newYaw = -180;

    this.vrThreeService.setAllLevels(
      currentLevels.roll,
      currentLevels.pitch,
      newYaw
    );

    this.showTemporaryMessage(`Yaw derecha: ${newYaw.toFixed(1)}°`);
  }

// ========== PRESETS COMBINADOS ==========

// Aplicar preset combinado
  applyFullPreset(roll: number, pitch: number = 0, yaw: number = 0): void {
    if (!this.isLevelerActive) {
      this.showTemporaryMessage('Activar nivelador primero', 'error');
      return;
    }

    this.vrThreeService.setAllLevels(roll, pitch, yaw);
    this.showTemporaryMessage(`Preset aplicado - R:${roll}° P:${pitch}° Y:${yaw}°`);
  }

// ========== GETTERS PARA MOSTRAR VALORES EN EL TEMPLATE ==========

  get currentRollAngle(): number {
    return this.vrThreeService.getCurrentLevels().roll;
  }

  get currentPitchAngle(): number {
    return this.vrThreeService.getCurrentLevels().pitch;
  }

  get currentYawAngle(): number {
    return this.vrThreeService.getCurrentLevels().yaw;
  }

// ========== GUARDAR Y CARGAR AUTOMÁTICO (MEJORADO) ==========

// El método saveLevelingButton ya guarda todos los ángulos automáticamente
// El método loadAndApplyLeveling en vrThreeService ya carga todos los ángulos automáticamente

// Método adicional para forzar recarga de nivelación
  async reloadCurrentLeveling(): Promise<void> {
    if (!this.currentPanoramaId) {
      this.showTemporaryMessage('No hay panorama activo', 'error');
      return;
    }

    try {
      const success = await this.vrThreeService.applyLevelingFromData(this.currentPanoramaId);
      if (success) {
        this.showTemporaryMessage('Nivelación recargada desde base de datos');
      } else {
        this.showTemporaryMessage('No hay nivelación guardada para este panorama');
      }
    } catch (error) {
      console.error('Error recargando nivelación:', error);
      this.showTemporaryMessage('Error al recargar', 'error');
    }
  }

  get levelingStats() {
    return this.levelerService.getLevelingStats();
  }

  get Math() {
    return Math;
  }

  protected readonly FullScreenService = FullScreenService;
}
