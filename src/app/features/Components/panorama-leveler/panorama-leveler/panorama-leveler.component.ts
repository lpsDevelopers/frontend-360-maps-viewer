import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {PanoramaLevelData, PanoramaLevelerService} from "../../../Services/panorama-leveler/panorama-leveler.service";
import {Subscription} from "rxjs";
import {VrThreeService} from "../../../Services/viewer-360/vrThree/vr-three.service";

@Component({
  selector: 'app-panorama-leveler',
  templateUrl: './panorama-leveler.component.html',
  styleUrls: ['./panorama-leveler.component.scss']
})
export class PanoramaLevelerComponent implements OnInit, OnDestroy {
  @Input() currentPanoramaId: number | null = null;

  isActive = false;
  showAdvanced = false;
  hasChanges = false;

  currentRoll = 0;
  currentPitch = 0;
  currentYaw = 0;

  saveStatus = {
    class: 'saved',
    icon: 'fas fa-check',
    text: 'Guardado'
  };

  recentLevels: PanoramaLevelData[] = [];

  private subscription = new Subscription();
  private lastSavedRoll = 0;
  private lastSavedPitch = 0;
  private lastSavedYaw = 0;

  constructor(
    private levelerService: PanoramaLevelerService,
    private vrThreeService: VrThreeService
  ) {}

  ngOnInit() {
    // Suscribirse al estado del nivelador
    this.subscription.add(
      this.levelerService.levelerActive$.subscribe(active => {
        this.isActive = active;
      })
    );

    // Suscribirse a cambios de datos de nivelación
    this.subscription.add(
      this.levelerService.currentLevel$.subscribe(levelData => {
        if (levelData) {
          this.currentRoll = levelData.rollAngle;
          this.currentPitch = levelData.pitchAngle;
          this.currentYaw = levelData.yawAngle;

          this.lastSavedRoll = levelData.rollAngle;
          this.lastSavedPitch = levelData.pitchAngle;
          this.lastSavedYaw = levelData.yawAngle;

          this.updateSaveStatus();
          this.updateHasChanges();
        }
      })
    );

    // Listener global para tecla N (activar nivelador)
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyN' && !event.repeat) {
        this.toggleLeveler();
        event.preventDefault();
      }
    });

    // Cargar datos del panorama actual si está disponible
    if (this.currentPanoramaId) {
      this.loadPanoramaLevel(this.currentPanoramaId);
    }

    this.loadRecentLevels();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  toggleLeveler() {
    this.isActive = !this.isActive;
    this.levelerService.toggleLeveler(this.isActive);

    if (this.isActive && this.currentPanoramaId) {
      this.loadPanoramaLevel(this.currentPanoramaId);
    }
  }

  async loadPanoramaLevel(panoramaId: number) {
    const levelData = await this.levelerService.loadLevelData(panoramaId);
    if (levelData) {
      // Los datos se actualizarán automáticamente vía subscription
      this.applyLevelToVR();
    }
  }

  onRollChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.currentRoll = parseFloat(target.value);
    this.applyLevelToVR();
    this.updateHasChanges();
    this.updateSaveStatus('unsaved');
  }

  onRollChangeComplete() {
    // Auto-guardar después de cambio completo
    setTimeout(() => this.saveCurrentLevel(), 500);
  }

  onPitchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.currentPitch = parseFloat(target.value);
    this.applyLevelToVR();
    this.updateHasChanges();
    this.updateSaveStatus('unsaved');
  }

  onPitchChangeComplete() {
    setTimeout(() => this.saveCurrentLevel(), 500);
  }

  onYawChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.currentYaw = parseFloat(target.value);
    this.applyLevelToVR();
    this.updateHasChanges();
    this.updateSaveStatus('unsaved');
  }

  onYawChangeComplete() {
    setTimeout(() => this.saveCurrentLevel(), 500);
  }

  adjustRoll(degrees: number) {
    this.currentRoll = Math.max(-45, Math.min(45, this.currentRoll + degrees));
    this.applyLevelToVR();
    this.updateHasChanges();
    this.updateSaveStatus('unsaved');

    // Auto-guardar para ajustes pequeños
    setTimeout(() => this.saveCurrentLevel(), 300);
  }

  async resetLevel() {
    if (!this.currentPanoramaId) return;

    this.currentRoll = 0;
    this.currentPitch = 0;
    this.currentYaw = 0;

    this.applyLevelToVR();
    await this.levelerService.resetLevel(this.currentPanoramaId);
    this.updateHasChanges();
    this.updateSaveStatus('saved');
  }

  async saveCurrentLevel() {
    if (!this.currentPanoramaId || !this.hasChanges) return;

    this.updateSaveStatus('saving');

    const success = await this.levelerService.saveLevelData({
      panoramaId: this.currentPanoramaId,
      rollAngle: this.currentRoll,
      pitchAngle: this.currentPitch,
      yawAngle: this.currentYaw
    });

    if (success) {
      this.lastSavedRoll = this.currentRoll;
      this.lastSavedPitch = this.currentPitch;
      this.lastSavedYaw = this.currentYaw;
      this.updateSaveStatus('saved');
      this.updateHasChanges();
      this.loadRecentLevels();
    } else {
      this.updateSaveStatus('error');
    }
  }

  async autoLevel() {
    // Implementación básica de auto-nivelación
    // En una versión avanzada, esto podría usar análisis de imagen
    this.updateSaveStatus('saving');

    try {
      // Simulación de auto-detección (reemplazar con lógica real)
      const detectedAngle = this.detectHorizonAngle();
      this.currentRoll = -detectedAngle; // Invertir para corregir

      this.applyLevelToVR();
      await this.saveCurrentLevel();

      console.log(`🤖 Auto-nivelación aplicada: ${detectedAngle.toFixed(1)}°`);
    } catch (error) {
      console.error('Error en auto-nivelación:', error);
      this.updateSaveStatus('error');
    }
  }

  async copyToAll() {
    if (!confirm('¿Aplicar esta configuración de nivelación a todos los panoramas?')) {
      return;
    }

    // Aquí implementarías la lógica para aplicar a todos los panoramas
    console.log('🔄 Aplicando configuración a todos los panoramas...');

    // Ejemplo: iterar sobre todos los panoramas conocidos
    // const allPanoramas = await this.apiService.getAllPanoramas();
    // for (const panorama of allPanoramas) {
    //   await this.levelerService.saveLevelData({
    //     panoramaId: panorama.id,
    //     rollAngle: this.currentRoll,
    //     pitchAngle: this.currentPitch,
    //     yawAngle: this.currentYaw
    //   });
    // }
  }

  applyQuickLevel(levelData: PanoramaLevelData) {
    this.currentRoll = levelData.rollAngle;
    this.currentPitch = levelData.pitchAngle;
    this.currentYaw = levelData.yawAngle;

    this.applyLevelToVR();
    this.updateHasChanges();
    this.updateSaveStatus('unsaved');
  }

  private applyLevelToVR() {
    // Aplicar la nivelación al servicio VR
    this.vrThreeService.setHorizonLevel(this.currentRoll);

    // Si tienes controles para pitch y yaw, aplicarlos también
    // this.vrThreeService.setPitchLevel?.(this.currentPitch);
    // this.vrThreeService.setYawLevel?.(this.currentYaw);
  }


  private updateHasChanges() {
    this.hasChanges =
      this.currentRoll !== this.lastSavedRoll ||
      this.currentPitch !== this.lastSavedPitch ||
      this.currentYaw !== this.lastSavedYaw;
  }

  private updateSaveStatus(status?: 'saved' | 'unsaved' | 'saving' | 'error') {
    if (!status) {
      status = this.hasChanges ? 'unsaved' : 'saved';
    }

    switch (status) {
      case 'saved':
        this.saveStatus = {
          class: 'saved',
          icon: 'fas fa-check',
          text: 'Guardado'
        };
        break;
      case 'unsaved':
        this.saveStatus = {
          class: 'unsaved',
          icon: 'fas fa-exclamation-triangle',
          text: 'Sin guardar'
        };
        break;
      case 'saving':
        this.saveStatus = {
          class: 'saving',
          icon: 'fas fa-spinner fa-spin',
          text: 'Guardando...'
        };
        break;
      case 'error':
        this.saveStatus = {
          class: 'error',
          icon: 'fas fa-times',
          text: 'Error'
        };
        break;
    }
  }

  private loadRecentLevels() {
    // Cargar los últimos 5 panoramas nivelados
    try {
      const stored = localStorage.getItem('panorama_levels');
      if (stored) {
        const allData: { [key: number]: PanoramaLevelData } = JSON.parse(stored);
        this.recentLevels = Object.values(allData)
          .filter(data => data.rollAngle !== 0)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);
      }
    } catch (error) {
      console.error('Error cargando niveles recientes:', error);
    }
  }

  private detectHorizonAngle(): number {
    // Implementación simplificada de detección de horizonte
    // En una versión real, esto analizaría la imagen del panorama

    // Por ahora, retorna un valor aleatorio para demostración
    return (Math.random() - 0.5) * 10; // Entre -5 y +5 grados
  }

  getBubbleClass(): string {
    const absLevel = Math.abs(this.currentRoll);
    if (absLevel <= 2) return 'level-good';
    if (absLevel <= 10) return 'level-warning';
    return 'level-danger';
  }

  get Math() {
    return Math;
  }
  getAngleDescription(angle: number): string {
    if (Math.abs(angle) < 0.5) {
      return 'Imagen nivelada perfectamente';
    } else if (angle > 0) {
      return `Corrigiendo inclinación hacia la derecha`;
    } else {
      return `Corrigiendo inclinación hacia la izquierda`;
    }
  }

  resetAllCorrections(): void {
    if (!this.currentPanoramaId) return;

    this.currentRoll = 0;
    this.currentPitch = 0;
    this.currentYaw = 0;

    this.applyLevelToVR();
    this.updateHasChanges();
    this.updateSaveStatus('unsaved');

    // Auto-guardar reset
    setTimeout(() => this.saveCurrentLevel(), 500);
  }
}
