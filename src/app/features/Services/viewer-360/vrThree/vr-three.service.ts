import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ApiService } from "../api/api.service";
import { Hotspot } from "../../../Model/types";
import { WebGLRenderer } from "three";
import { ModalService } from "../modal/modal.service";
import { Subject } from "rxjs";
import { OpenHotspotService } from "../openHotspot/open-hotspot.service";
import { PanoramaSyncService } from "../../panorama-sync/panorama-sync.service";
import {PanoramaLevelerService} from "../../panorama-leveler/panorama-leveler.service";

@Injectable({
  providedIn: 'root',
})
export class VrThreeService implements OnDestroy {
  alphaOffset: number = 0;
  isLoading = true;
  orbitControlMode = true;
  controls: OrbitControls | undefined;

  // Variables para manejo de recursos
  private sphereMesh?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private renderer: THREE.WebGLRenderer | undefined;
  private texture: THREE.Texture | undefined;
  private imageUrl: string | undefined;
  private markers: THREE.Mesh[] = [];
  private scene: THREE.Scene | undefined;
  private camera: THREE.PerspectiveCamera | undefined;
  private orientationHandler: ((event: DeviceOrientationEvent) => void) | undefined;
  private changeModeButton: HTMLElement | null = null;
  private clickHandler: ((event: MouseEvent) => void) | undefined;
  private leftDoubleClickInHotspotsHandler : ((event: MouseEvent) => void) | undefined;
  private rightClickHandler: ((event: MouseEvent) => void) | undefined;
  private resizeHandler: (() => void) | undefined;
  private animationId: number | undefined;
  private tooltipCallback?: (x: number, y: number, label: string) => void;
  private hoverHandler?: (event: MouseEvent) => void;
  public selectedHotspot: THREE.Mesh | null = null;
  private sphereClickSubject = new Subject<{position: THREE.Vector3, cameraOrientation: number}>();
  public sphereClick$ = this.sphereClickSubject.asObservable();

  // Variables para el modo de creación de hotspots
  private creationMode = false;
  private tempHotspot: THREE.Mesh | null = null;

  // NUEVA VARIABLE: Mapa para persistir colores de hotspots
  private hotspotColors: Map<string, number> = new Map();

  // NUEVA VARIABLE: Mapa para persistir tipos de hotspots
  private hotspotTypes: Map<string, string> = new Map();

  private currentPanoramaId: number | null = null;

  // ===== VARIABLES PARA NIVELACIÓN DE HORIZONTE =====
  private horizonLevelMode = false;
  private horizonLine: THREE.Line | null = null;
  private horizontalRotation = 0; // Rotación en el eje Z para nivelar
  private pitchRotation = 0; // Rotación en el eje X
  private yawRotation = 0; // Rotación en el eje Y
  private levelModeButton: HTMLElement | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | undefined;
  private wheelHandler: ((event: WheelEvent) => void) | undefined;
  private horizonLevelSubject = new Subject<number>();
  public horizonLevel$ = this.horizonLevelSubject.asObservable();
  private levelerService: PanoramaLevelerService;

  // Agregar estas propiedades a la clase VrThreeService
  private levelLeftButton: HTMLElement | null = null;
  private levelRightButton: HTMLElement | null = null;
  private levelResetButton: HTMLElement | null = null;
  private levelToggleButton: HTMLElement | null = null;
  private levelDisplay: HTMLElement | null = null;

  constructor(
    private apiService: ApiService,
    private modalService: ModalService,
    private openHotspotService: OpenHotspotService,
    private panoramaSyncService: PanoramaSyncService,
    levelerService: PanoramaLevelerService

) {
    this.levelerService = levelerService;
    this.renderer = new WebGLRenderer();
  }

  // Método para activar/desactivar modo de creación
  toggleCreationMode(enabled: boolean) {
    this.creationMode = enabled;
    console.log('Modo creación de hotspots:', this.creationMode ? 'activado' : 'desactivado');
    if (!enabled && this.tempHotspot) {
      this.removeTempHotspot();
    }
  }

  testImageLeveling() {
    console.log('🧪 Probando nivelación de imagen panorámica...');

    if (!this.sphereMesh) {
      console.error('❌ No hay esfera disponible para probar');
      return;
    }

    // Probar diferentes ángulos de corrección
    const testAngles = [-10, -5, 0, 5, 10, 15, 0];
    let currentIndex = 0;

    const testInterval = setInterval(() => {
      if (currentIndex >= testAngles.length) {
        clearInterval(testInterval);
        console.log('✅ Prueba de nivelación de imagen completada');
        return;
      }

      const angle = testAngles[currentIndex];
      console.log(`Probando corrección de imagen: ${angle}°`);
      this.setHorizonLevel(angle);
      currentIndex++;
    }, 1500);
  }

  async resetCurrentLeveling(): Promise<void> {
    if (this.currentPanoramaId) {
      await this.levelerService.resetLevel(this.currentPanoramaId);
      this.resetHorizonLevel();
      console.log('🔄 Nivelación de imagen reseteada');
    }
  }

  createScene() {
    console.log('Creando escena 3D...');
    this.isLoading = true;

    // Limpiar recursos previos (pero NO limpiar los mapas de colores)
    this.cleanupWithoutColorMaps();

    this.scene = new THREE.Scene();
    const quaternion = new THREE.Quaternion();
    const screenOrientation = window.orientation || 0;

    // 1. Configuración de textura
    this.setupTextureLoading();

    // 2. Configuración del renderer
    this.setupRenderer();

    // 3. Configuración de la cámara
    this.camera = this.setupCamera();

    // 4. Configuración de controles de órbita
    this.setupOrbitControls(this.camera, this.renderer!);

    // 5. Configuración de eventos
    this.setupEventListeners(this.camera, quaternion, screenOrientation);

    // 6. Animación
    this.startAnimation();

    // 7. Configuración de botones de nivelación (NUEVO)
    this.setupLevelingButtons();
    this.setupTouchControls();

  }

  // Método para configurar los botones de nivelación UI

  private setupAdvancedKeyboardControls(): void {
    const advancedKeyHandler = (event: KeyboardEvent) => {
      if (!this.horizonLevelMode) return;

      switch (event.code) {
        case 'Comma': // Coma para -0.1°
          this.adjustHorizonLevel(-0.1);
          event.preventDefault();
          break;
        case 'Period': // Punto para +0.1°
          this.adjustHorizonLevel(0.1);
          event.preventDefault();
          break;
        case 'Digit1':
          this.setHorizonLevel(-10);
          event.preventDefault();
          break;
        case 'Digit2':
          this.setHorizonLevel(-5);
          event.preventDefault();
          break;
        case 'Digit3':
          this.setHorizonLevel(0);
          event.preventDefault();
          break;
        case 'Digit4':
          this.setHorizonLevel(5);
          event.preventDefault();
          break;
        case 'Digit5':
          this.setHorizonLevel(10);
          event.preventDefault();
          break;
      }
    };

    document.addEventListener('keydown', advancedKeyHandler);
  }

  private cleanupLevelingButtons(): void {
    if (this.levelLeftButton) {
      const newButton = this.levelLeftButton.cloneNode(true);
      this.levelLeftButton.parentNode?.replaceChild(newButton, this.levelLeftButton);
      this.levelLeftButton = null;
    }

    if (this.levelRightButton) {
      const newButton = this.levelRightButton.cloneNode(true);
      this.levelRightButton.parentNode?.replaceChild(newButton, this.levelRightButton);
      this.levelRightButton = null;
    }

    if (this.levelResetButton) {
      const newButton = this.levelResetButton.cloneNode(true);
      this.levelResetButton.parentNode?.replaceChild(newButton, this.levelResetButton);
      this.levelResetButton = null;
    }

    if (this.levelToggleButton) {
      const newButton = this.levelToggleButton.cloneNode(true);
      this.levelToggleButton.parentNode?.replaceChild(newButton, this.levelToggleButton);
      this.levelToggleButton = null;
    }
  }



  private setupTouchControls(): void {
    if (!this.renderer?.domElement) return;

    let startX = 0;
    let isRotating = false;

    const touchStart = (e: TouchEvent) => {
      if (!this.horizonLevelMode || e.touches.length !== 2) return;
      startX = e.touches[0].clientX;
      isRotating = true;
      e.preventDefault();
    };

    const touchMove = (e: TouchEvent) => {
      if (!isRotating || !this.horizonLevelMode || e.touches.length !== 2) return;

      const currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;

      // Convertir movimiento horizontal a rotación (sensibilidad ajustable)
      const rotationDelta = deltaX * 0.1; // 0.1° por pixel

      if (Math.abs(rotationDelta) > 0.5) { // Umbral mínimo
        this.adjustHorizonLevel(rotationDelta);
        startX = currentX;
      }

      e.preventDefault();
    };

    const touchEnd = () => {
      isRotating = false;
    };

    this.renderer.domElement.addEventListener('touchstart', touchStart, { passive: false });
    this.renderer.domElement.addEventListener('touchmove', touchMove, { passive: false });
    this.renderer.domElement.addEventListener('touchend', touchEnd);
  }

  private updateLevelingButtonsState(): void {
    const isActive = this.horizonLevelMode;

    if (this.levelToggleButton) {
      this.levelToggleButton.classList.toggle('active', isActive);
      this.levelToggleButton.textContent = isActive ? 'Salir Nivelación' : 'Nivelar Horizonte';
    }

    if (this.levelLeftButton) {
      this.levelLeftButton.style.display = isActive ? 'block' : 'none';
    }

    if (this.levelRightButton) {
      this.levelRightButton.style.display = isActive ? 'block' : 'none';
    }

    if (this.levelResetButton) {
      this.levelResetButton.style.display = isActive ? 'block' : 'none';
    }

    if (this.levelDisplay) {
      this.levelDisplay.style.display = isActive ? 'block' : 'none';
    }
  }

  private setupLevelingButtons(): void {
    // Botón para rotar izquierda (-1°)
    this.levelLeftButton = document.querySelector('.level-left-btn');
    if (this.levelLeftButton) {
      this.levelLeftButton.addEventListener('click', () => {
        if (this.horizonLevelMode) {
          this.adjustHorizonLevel(-1);
        }
      });
    }

    // Botón para rotar derecha (+1°)
    this.levelRightButton = document.querySelector('.level-right-btn');
    if (this.levelRightButton) {
      this.levelRightButton.addEventListener('click', () => {
        if (this.horizonLevelMode) {
          this.adjustHorizonLevel(1);
        }
      });
    }

    // Botón para resetear nivelación
    this.levelResetButton = document.querySelector('.level-reset-btn');
    if (this.levelResetButton) {
      this.levelResetButton.addEventListener('click', () => {
        this.resetHorizonLevel();
      });
    }

    // Botón para activar/desactivar modo nivelación
    this.levelToggleButton = document.querySelector('.level-toggle-btn');
    if (this.levelToggleButton) {
      this.levelToggleButton.addEventListener('click', () => {
        this.toggleHorizonLevelMode(!this.horizonLevelMode);
        this.updateLevelingButtonsState();
      });
    }

    // Display para mostrar el ángulo actual
    this.levelDisplay = document.querySelector('.level-display');

    // Suscribirse a cambios de nivelación para actualizar UI
    this.horizonLevel$.subscribe(angle => {
      this.updateLevelDisplay(angle);
    });
  }

  private updateLevelDisplay(angle: number): void {
    if (this.levelDisplay) {
      this.levelDisplay.textContent = `${angle.toFixed(1)}°`;
    }
  }

// Métodos públicos para control programático
  public rotateLeft(degrees: number = 1): void {
    if (this.horizonLevelMode) {
      this.adjustHorizonLevel(-degrees);
    }
  }

  public rotateRight(degrees: number = 1): void {
    if (this.horizonLevelMode) {
      this.adjustHorizonLevel(degrees);
    }
  }

  public setFineRotation(degrees: number): void {
    this.setHorizonLevel(degrees);
  }

// Método para rotación con incrementos finos (0.1°)
  public adjustFineLevel(degrees: number): void {
    this.adjustHorizonLevel(degrees);
  }



  private startAnimation() {
    if (!this.scene || !this.camera) {
      console.error('No hay escena o cámara disponible para iniciar la animación');
      return;
    }

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Actualizar controles sin interferir con la rotación de la esfera
      if (this.orbitControlMode && this.controls) {
        this.controls.update();
        // NO tocar this.camera.rotation.z ni this.sphereMesh.rotation aquí
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
    console.log('Animación iniciada (respetando nivelación de imagen)');

    // Cargar datos del panorama actual
    const panoramaId = this.panoramaSyncService.getCurrentPanoramaIdSync();
    if (panoramaId !== null) {
      this.currentPanoramaId = panoramaId;

      // Cargar nivelación automáticamente al iniciar
      this.loadAndApplyLeveling(panoramaId);

      // Cargar hotspots
      this.apiService.getPostesByPanorama(panoramaId).subscribe((hotspots: Hotspot[]) => {
        console.log('Lista de hotspots para pintado: ', hotspots);
        if (this.scene) {
          hotspots.forEach(h => {
            const mesh = this.addHotspot(this.scene!, h.theta, h.phi, 5, h);
            this.paintHotspot(mesh, h.tipoPoste || '');
          });
        }
      });
    }
  }

  toggleHorizonLevelMode(enabled: boolean) {
    this.horizonLevelMode = enabled;
    console.log('Modo nivelación de horizonte:', this.horizonLevelMode ? 'activado' : 'desactivado');

    if (this.horizonLevelMode) {
      this.showHorizonLine();
      this.setupHorizonLevelControls();
    } else {
      this.hideHorizonLine();
      this.removeHorizonLevelControls();
    }
  }

  private setupHorizonLevelControls() {
    // Controles de teclado
    this.keyHandler = (event: KeyboardEvent) => {
      if (!this.horizonLevelMode) return;

      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.adjustHorizonLevel(-1);
          event.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.adjustHorizonLevel(1);
          event.preventDefault();
          break;
        case 'KeyR':
          this.resetHorizonLevel();
          event.preventDefault();
          break;
        case 'Escape':
          this.toggleHorizonLevelMode(false);
          event.preventDefault();
          break;
      }
    };

    // Control con rueda del mouse
    this.wheelHandler = (event: WheelEvent) => {
      if (!this.horizonLevelMode) return;

      event.preventDefault();
      const delta = event.deltaY > 0 ? 1 : -1;
      this.adjustHorizonLevel(delta * 0.5);
    };

    document.addEventListener('keydown', this.keyHandler);
    if (this.renderer?.domElement) {
      this.renderer.domElement.addEventListener('wheel', this.wheelHandler, { passive: false });
    }
  }

  private resetHorizonLevel() {
    this.horizontalRotation = 0;
    this.pitchRotation = 0;
    this.yawRotation = 0;

    // Resetear rotación de la esfera
    if (this.sphereMesh) {
      this.sphereMesh.rotation.set(0, 0, 0);
    }

    this.horizonLevelSubject.next(0);
    console.log('🔄 Imagen panorámica reseteada a posición original');

    // Forzar render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // Guardar reset
    if (this.currentPanoramaId) {
      this.saveLevelingToService();
    }
  }

  private applyHorizonLevelRotation() {
    console.log('🎯 applyHorizonLevelRotation iniciado');

    if (!this.sphereMesh) {
      console.error('❌ No hay esfera disponible para nivelar la imagen en applyHorizonLevelRotation');
      return;
    }

    // Convertir grados a radianes
    const rollRad = THREE.MathUtils.degToRad(this.horizontalRotation);

    console.log(`🎯 Nivelando imagen panorámica: ${this.horizontalRotation.toFixed(1)}° (${rollRad} rad)`);

    // MOSTRAR ESTADO ANTES
    console.log('Estado ANTES - sphereMesh.rotation:', {
      x: THREE.MathUtils.radToDeg(this.sphereMesh.rotation.x).toFixed(2) + '°',
      y: THREE.MathUtils.radToDeg(this.sphereMesh.rotation.y).toFixed(2) + '°',
      z: THREE.MathUtils.radToDeg(this.sphereMesh.rotation.z).toFixed(2) + '°'
    });

    // IMPORTANTE: Rotar la ESFERA, no la cámara
    // Esto corrige la inclinación de la foto panorámica
    this.sphereMesh.rotation.z = rollRad;

    // También podemos aplicar pitch y yaw si es necesario
    if (this.pitchRotation !== 0) {
      this.sphereMesh.rotation.x = THREE.MathUtils.degToRad(this.pitchRotation);
    }

    if (this.yawRotation !== 0) {
      this.sphereMesh.rotation.y = THREE.MathUtils.degToRad(this.yawRotation);
    }

    // MOSTRAR ESTADO DESPUÉS
    console.log('Estado DESPUÉS - sphereMesh.rotation:', {
      x: THREE.MathUtils.radToDeg(this.sphereMesh.rotation.x).toFixed(2) + '°',
      y: THREE.MathUtils.radToDeg(this.sphereMesh.rotation.y).toFixed(2) + '°',
      z: THREE.MathUtils.radToDeg(this.sphereMesh.rotation.z).toFixed(2) + '°'
    });

    // Forzar re-render para mostrar el cambio inmediatamente
    if (this.renderer && this.scene && this.camera) {
      console.log('🔄 Forzando re-render...');
      this.renderer.render(this.scene, this.camera);
      console.log('✅ Re-render completado');
    } else {
      console.error('❌ No se puede hacer re-render, faltan componentes:', {
        renderer: !!this.renderer,
        scene: !!this.scene,
        camera: !!this.camera
      });
    }

    console.log(`✅ Imagen panorámica nivelada a ${this.horizontalRotation.toFixed(1)}°`);
  }

  testSphereRotation() {
    console.log('🧪 INICIANDO PRUEBA DIRECTA DE ROTACIÓN DE ESFERA');

    if (!this.sphereMesh) {
      console.error('❌ No hay esfera para probar');
      console.log('Scene:', !!this.scene, 'Camera:', !!this.camera, 'Renderer:', !!this.renderer);
      return;
    }

    console.log('✅ Esfera encontrada, iniciando prueba automática...');

    // Probar rotaciones directas
    const testAngles = [0, 10, 20, -10, -20, 0];
    let index = 0;

    const interval = setInterval(() => {
      if (index >= testAngles.length) {
        clearInterval(interval);
        console.log('✅ Prueba automática completada');
        return;
      }

      const angle = testAngles[index];
      console.log(`🎯 Probando ángulo: ${angle}°`);

      // Llamar al método principal
      this.setHorizonLevel(angle);

      index++;
    }, 2000); // 2 segundos entre cada prueba
  }

  private adjustHorizonLevel(degrees: number) {
    this.horizontalRotation += degrees;

    // Limitar la rotación entre -45 y 45 grados
    this.horizontalRotation = Math.max(-45, Math.min(45, this.horizontalRotation));

    // Aplicar la corrección
    this.applyHorizonLevelRotation();
    this.horizonLevelSubject.next(this.horizontalRotation);

    console.log(`🎯 Imagen ajustada: ${this.horizontalRotation.toFixed(1)}°`);

    // Auto-guardar
    if (this.currentPanoramaId) {
      this.saveLevelingToService();
    }
  }

  setAllLevels(roll: number, pitch: number = 0, yaw: number = 0) {
    this.horizontalRotation = Math.max(-45, Math.min(45, roll));
    this.pitchRotation = Math.max(-30, Math.min(30, pitch));
    this.yawRotation = Math.max(-180, Math.min(180, yaw));

    console.log(`🎚️ Aplicando corrección completa - Roll: ${roll}°, Pitch: ${pitch}°, Yaw: ${yaw}°`);

    // Aplicar todas las correcciones
    this.applyHorizonLevelRotation();

    // Emitir cambios
    this.horizonLevelSubject.next(this.horizontalRotation);
  }

  getCurrentHorizonLevel(): number {
    return this.horizontalRotation;
  }

  getCurrentLevels(): { roll: number, pitch: number, yaw: number } {
    return {
      roll: this.horizontalRotation,
      pitch: this.pitchRotation,
      yaw: this.yawRotation
    };
  }

  private async loadAndApplyLeveling(panoramaId: number): Promise<void> {
    try {
      const levelData = await this.levelerService.loadLevelData(panoramaId);
      if (levelData) {
        console.log(`📁 Cargando nivelación guardada para panorama ${panoramaId}:`, {
          roll: levelData.rollAngle,
          pitch: levelData.pitchAngle,
          yaw: levelData.yawAngle
        });

        // Aplicar la nivelación guardada
        this.setAllLevels(
          levelData.rollAngle,
          levelData.pitchAngle,
          levelData.yawAngle
        );

        console.log(`✅ Nivelación aplicada automáticamente`);
      } else {
        console.log(`📁 No hay nivelación guardada para panorama ${panoramaId}`);
        // Resetear a posición original si no hay datos guardados
        this.setAllLevels(0, 0, 0);
      }
    } catch (error) {
      console.warn('Error cargando nivelación guardada:', error);
      // En caso de error, resetear a posición original
      this.setAllLevels(0, 0, 0);
    }
  }


  private async saveLevelingToService(): Promise<void> {
    if (!this.currentPanoramaId) return;

    try {
      await this.levelerService.saveLevelData({
        panoramaId: this.currentPanoramaId,
        rollAngle: this.horizontalRotation,
        pitchAngle: this.pitchRotation,
        yawAngle: this.yawRotation
      });

      console.log(`💾 Nivelación guardada para panorama ${this.currentPanoramaId}`);
    } catch (error) {
      console.warn('Error guardando nivelación:', error);
    }
  }



  async applyLevelingFromData(panoramaId: number): Promise<boolean> {
    try {
      const levelData = await this.levelerService.loadLevelData(panoramaId);
      if (levelData) {
        this.setAllLevels(
          levelData.rollAngle,
          levelData.pitchAngle,
          levelData.yawAngle
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error aplicando nivelación desde datos:', error);
      return false;
    }
  }

  private removeHorizonLevelControls() {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = undefined;
    }

    if (this.wheelHandler && this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
  }

  private hideHorizonLine() {
    if (this.horizonLine && this.scene) {
      this.scene.remove(this.horizonLine);
      this.horizonLine.geometry.dispose();
      (this.horizonLine.material as THREE.LineBasicMaterial).dispose();
      this.horizonLine = null;
    }
  }

  private showHorizonLine() {
    if (!this.scene || this.horizonLine) return;

    const points = [];
    for (let i = 0; i <= 360; i += 5) {
      const angle = (i * Math.PI) / 180;
      const radius = 4.8; // Ligeramente menor que la esfera
      points.push(new THREE.Vector3(
        radius * Math.cos(angle),
        0, // Línea horizontal
        radius * Math.sin(angle)
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x4CAF50,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });

    this.horizonLine = new THREE.Line(geometry, material);
    this.horizonLine.renderOrder = 1000; // Renderizar por encima
    this.scene.add(this.horizonLine);
  }

  setHorizonLevel(degrees: number) {
    console.log('🎯 setHorizonLevel llamado con degrees:', degrees);

    const newRotation = Math.max(-45, Math.min(45, degrees));
    console.log('🎯 newRotation calculado:', newRotation);

    // Solo aplicar si realmente cambió
    if (Math.abs(this.horizontalRotation - newRotation) < 0.01) {
      console.log('⚠️ Cambio muy pequeño, omitiendo. Current:', this.horizontalRotation, 'New:', newRotation);
      return;
    }

    this.horizontalRotation = newRotation;
    console.log('✅ horizontalRotation actualizado a:', this.horizontalRotation);
    console.log(`🎚️ Aplicando corrección de nivelación: ${this.horizontalRotation.toFixed(1)}°`);

    // VERIFICAR QUE LA ESFERA EXISTE ANTES DE APLICAR
    if (!this.sphereMesh) {
      console.error('❌ sphereMesh NO EXISTE!');
      console.log('Scene existe:', !!this.scene);
      console.log('Camera existe:', !!this.camera);
      console.log('Renderer existe:', !!this.renderer);
      return;
    }

    console.log('✅ sphereMesh encontrado, aplicando rotación...');

    // Aplicar la corrección a la imagen
    this.applyHorizonLevelRotation();

    // Emitir el cambio para actualizar la UI
    this.horizonLevelSubject.next(this.horizontalRotation);

    // Auto-guardar si hay un panorama actual
    if (this.currentPanoramaId) {
      console.log('💾 Auto-guardando para panorama:', this.currentPanoramaId);
      this.saveLevelingToService();
    } else {
      console.log('⚠️ No hay currentPanoramaId para auto-guardar');
    }
  }

  registerTooltipCallback(cb: (x: number, y: number, label: string) => void) {
    this.tooltipCallback = cb;
  }

  private setupTextureLoading() {
    const loadingManager = new THREE.LoadingManager(() => {
      this.isLoading = false;
      console.log('Textura cargada, isLoading:', this.isLoading);
      if (this.scene && this.texture) {
        this.createSphere(this.scene);
      }
    });

    const textureLoader = new THREE.TextureLoader(loadingManager);
    const selected = this.apiService.selectedImageUrl;

    if (typeof selected === 'string' && selected.trim() !== '') {
      this.imageUrl = selected;
      console.log('Usando URL de imagen seleccionada:', this.imageUrl);
    } else if (selected instanceof ArrayBuffer) {
      const blob = new Blob([selected]);
      this.imageUrl = URL.createObjectURL(blob);
      console.log('Usando imagen desde ArrayBuffer como Blob URL:', this.imageUrl);
    } else {
      this.imageUrl = '../../assets/images/oil_painting_van_gogh_starry_night.webp';
      console.warn('URL inválida. Usando imagen por defecto:', this.imageUrl);
    }

    this.texture = textureLoader.load(this.imageUrl);
  }

  private setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const backgroundContainer = document.querySelector('.sphere');
    if (!backgroundContainer) {
      console.error('No se encontró el contenedor .sphere en el DOM.');
      return;
    }

    while (backgroundContainer.firstChild) {
      backgroundContainer.removeChild(backgroundContainer.firstChild);
    }
    backgroundContainer.appendChild(this.renderer.domElement);
    console.log('Renderer agregado al contenedor .sphere');
  }

  private createSphere(scene: THREE.Scene): void {
    if (!this.texture) {
      console.warn('No hay textura disponible para crear la esfera');
      return;
    }

    if (this.sphereMesh && scene) {
      scene.remove(this.sphereMesh);
      this.sphereMesh.geometry.dispose();
      (this.sphereMesh.material as THREE.MeshBasicMaterial).dispose();
    }

    const geometry = new THREE.SphereGeometry(5, 60, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.DoubleSide
    });

    this.sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(this.sphereMesh);
  }

  private setupCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    camera.position.set(0, 0, 3.4);
    console.log('Cámara creada y posicionada');
    return camera;
  }

  private setupOrbitControls(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    if (!renderer?.domElement) {
      console.error('Renderer o domElement no disponible para configurar controles');
      return;
    }

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = -0.8;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 3.5;
    this.controls.minDistance = 0;
    this.controls.maxDistance = 4.20;
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener('change', () => {});
    console.log('Controles de órbita creados y configurados');
  }

  private setupEventListeners(
    camera: THREE.PerspectiveCamera,
    quaternion: THREE.Quaternion,
    screenOrientation: number
  ) {
    if (!this.scene) {
      console.error('No hay escena disponible para configurar event listeners');
      return;
    }

    let lastHoveredHotspot: THREE.Object3D | null = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById('hotspot-tooltip');

    this.leftDoubleClickInHotspotsHandler = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersectsHotspots = raycaster.intersectObjects(this.markers);

      if (intersectsHotspots.length > 0) {
        this.modalService.openModal$.subscribe(isOpen => {
          if (isOpen) {
            if (this.hoverHandler && this.renderer?.domElement) {
              this.renderer.domElement.removeEventListener('mousemove', this.hoverHandler);
            }
            if (this.tooltipCallback) {
              this.tooltipCallback(0, 0, '');
            }
          } else {
            if (this.hoverHandler && this.renderer?.domElement) {
              this.renderer.domElement.addEventListener('mousemove', this.hoverHandler);
            }
          }
        });

        const hotspot = intersectsHotspots[0].object;
        console.log('HostPot Seleccionado: ', hotspot);
        const userData = hotspot.userData;

        this.modalService.openModal({
          id: userData['id'] ?? 0,
          item: userData['item'] ?? 0, // Nuevo campo
          codigoPosteAntiguo: userData['label'] ?? 'Sin etiqueta', // label -> codigoPosteAntiguo
          pitch: userData['pitch'] ?? 0,
          yaw: userData['yaw'] ?? 0,
          theta: userData['theta'] ?? 0,
          phi: userData['phi'] ?? 0,
          tipoPoste: userData['type_hotspot'] ?? 'Desconocido', // type_hotspot -> tipoPoste
          criticidad: userData['criticidad'] ?? 'Media', // Nuevo campo
          red: userData['red'] ?? 'Eléctrica', // Nuevo campo
          tipoRed: userData['tipoRed'] ?? 'Distribución', // Nuevo campo
          alturaSoporte: userData['alturaSoporte'] ?? 0, // Nuevo campo
          alturaVano: userData['alturaVano'] ?? 0, // Nuevo campo
          codigoDistrito: userData['codigoDistrito'] ?? '', // Nuevo campo
          tipoVia: userData['tipoVia'] ?? '', // Nuevo campo
          nombreVia: userData['title'] ?? '', // title -> nombreVia
          numero: userData['numero'] ?? '', // Nuevo campo
          manzana: userData['manzana'] ?? '', // Nuevo campo
          lote: userData['lote'] ?? '', // Nuevo campo
          coordenadas: userData['coordenadas'] ?? '', // Nuevo campo
          latitudS: userData['latitudS'] ?? '', // Nuevo campo
          longitudW: userData['longitudW'] ?? '', // Nuevo campo
          urbanizacion: userData['urbanizacion'] ?? '', // Nuevo campo
          posteSiguiente: userData['posteSiguiente'] ?? '', // Nuevo campo
          observacion1: userData['description'] ?? '', // description -> observacion1
          observacion2: userData['observacion2'] ?? '',
          observacion3: userData['observacion3'] ?? '',
          condicion: userData['state'] === 1 ? 'Activo' : 'Inactivo',
          trabajoARealizar: userData['text'] ?? '',
          panoramasId: userData['panoramasId'] ?? 0,
          viewCapturePath: userData['viewCapturePath'] ? parseInt(userData['viewCapturePath']) : 0,
          filePath1: userData['filePath'] ?? '',
          filePath2: userData['filePath2'] ?? '',
          filePath3: userData['filePath3'] ?? ''
        });
        return;
      }
    }

    this.rightClickHandler = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersectsHotspots = raycaster.intersectObjects(this.markers);
      if (intersectsHotspots.length > 0) {
        this.modalService.openModal$.subscribe(isOpen => {
          if (isOpen) {
            if (this.hoverHandler && this.renderer?.domElement) {
              this.renderer.domElement.removeEventListener('mousemove', this.hoverHandler);
            }
            if (this.tooltipCallback) {
              this.tooltipCallback(0, 0, '');
            }
          } else {
            if (this.hoverHandler && this.renderer?.domElement) {
              this.renderer.domElement.addEventListener('mousemove', this.hoverHandler);
            }
          }
        });

        const hotspot = intersectsHotspots[0].object;
        console.log('HostPot Seleccionado: ', hotspot);


        const userData = hotspot.userData;

        this.modalService.openModal({
          id: userData['id'] ?? 0,
          item: userData['item'] ?? 0,
          codigoPosteAntiguo: userData['label'] ?? 'Sin etiqueta',
          pitch: userData['pitch'] ?? 0,
          yaw: userData['yaw'] ?? 0,
          theta: userData['theta'] ?? 0,
          phi: userData['phi'] ?? 0,
          tipoPoste: userData['type_hotspot'] ?? 'Desconocido',
          criticidad: userData['criticidad'] ?? 'Media',
          red: userData['red'] ?? 'Eléctrica',
          tipoRed: userData['tipoRed'] ?? 'Distribución',
          alturaSoporte: userData['alturaSoporte'] ?? 0,
          alturaVano: userData['alturaVano'] ?? 0,
          codigoDistrito: userData['codigoDistrito'] ?? '',
          tipoVia: userData['tipoVia'] ?? '',
          nombreVia: userData['title'] ?? '',
          numero: userData['numero'] ?? '',
          manzana: userData['manzana'] ?? '',
          lote: userData['lote'] ?? '',
          coordenadas: userData['coordenadas'] ?? '',
          latitudS: userData['latitudS'] ?? '',
          longitudW: userData['longitudW'] ?? '',
          urbanizacion: userData['urbanizacion'] ?? '',
          posteSiguiente: userData['posteSiguiente'] ?? '',
          observacion1: userData['description'] ?? '',
          observacion2: userData['observacion2'] ?? '',
          observacion3: userData['observacion3'] ?? '',
          condicion: userData['state'] === 1 ? 'Activo' : 'Inactivo',
          trabajoARealizar: userData['text'] ?? '',
          panoramasId: userData['panoramasId'] ?? 0,
          viewCapturePath: userData['viewCapturePath'] ? parseInt(userData['viewCapturePath']) : 0,
          filePath1: userData['filePath'] ?? '',
          filePath2: userData['filePath2'] ?? '',
          filePath3: userData['filePath3'] ?? ''
        });

        return;
      }

      if (!this.sphereMesh) {
        console.warn('No hay referencia a la esfera para agregar hotspots');
        return;
      }

      const intersectsSphere = raycaster.intersectObject(this.sphereMesh);
      if (intersectsSphere.length > 0) {
        const point = intersectsSphere[0].point;
        const radius = 5;
        const x = point.x;
        const y = point.y;
        const z = point.z;

        const phi = THREE.MathUtils.radToDeg(Math.acos(y / radius));
        const theta = THREE.MathUtils.radToDeg(Math.atan2(z, x));

        this.addHotspot(this.scene!, theta, phi, radius);
      }
    }

    this.clickHandler = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersectsHotspots = raycaster.intersectObjects(this.markers);
      if (intersectsHotspots.length > 0) {
        const hotspot = intersectsHotspots[0].object;
        this.onHotspotClick(hotspot as THREE.Mesh);
        return;
      }

      if (this.sphereMesh) {
        const intersectsSphere = raycaster.intersectObject(this.sphereMesh);
        if (intersectsSphere.length > 0) {
          const clickPosition = intersectsSphere[0].point;
          const cameraOrientation = this.getCameraOrientation(camera);
          this.sphereClickSubject.next({
            position: clickPosition,
            cameraOrientation
          });
        }
      }
    };

    if (this.renderer) {
      this.renderer.domElement.addEventListener('contextmenu', this.rightClickHandler, true);
      this.renderer.domElement.addEventListener('dblclick', this.clickHandler);
      this.renderer.domElement.addEventListener('contextmenu', (e) => {
        console.log('✅ Canvas recibió click derecho');
      }, true)
      console.log('Click derecho', this.rightClickHandler);

      let lastHoveredHotspot: THREE.Object3D | null = null;
      this.hoverHandler = (event: MouseEvent) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(this.markers);

        if (intersects.length > 0) {
          const hovered = intersects[0].object;
          const label = hovered.userData['title'] || hovered.userData['label'] || 'Hotspot';

          if (hovered !== lastHoveredHotspot) {
            lastHoveredHotspot = hovered;
          }

          if (this.tooltipCallback) {
            this.tooltipCallback(event.clientX + 10, event.clientY + 10, label);
          }
        } else {
          lastHoveredHotspot = null;
          if (this.tooltipCallback) {
            this.tooltipCallback(0, 0, '');
          }
        }
      };


      this.renderer.domElement.addEventListener('mousemove', this.hoverHandler);
    }

    this.changeModeButton = document.querySelector('.change-mode-btn');
    if (this.changeModeButton) {
      const toggleControls = () => {
        if (!this.camera || !this.renderer) {
          console.error('Cámara o renderer no disponible para cambiar controles');
          return;
        }
        if (this.orbitControlMode) {
          this.disposeControls();
        } else {
          this.setupOrbitControls(this.camera, this.renderer);
        }
        this.orbitControlMode = !this.orbitControlMode;
        console.log('Modo de control cambiado. OrbitControl activo:', this.orbitControlMode);
      };

      this.changeModeButton.addEventListener('click', toggleControls);
    }

    this.orientationHandler = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) + this.alphaOffset : 0;
      const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
      const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
      const orient = screenOrientation ? THREE.MathUtils.degToRad(screenOrientation) : 0;

      this.setOrientationQuaternion(quaternion, alpha, beta, gamma, orient);
      if (!this.orbitControlMode && this.renderer) {
        camera.quaternion.copy(quaternion);
      }
    };

    window.addEventListener('deviceorientation', this.orientationHandler);

    this.resizeHandler = () => {
      if (this.renderer && camera) {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  private removeTempHotspot() {
    if (this.tempHotspot && this.scene) {
      this.scene.remove(this.tempHotspot);
      this.tempHotspot.geometry.dispose();
      (this.tempHotspot.material as THREE.MeshBasicMaterial).dispose();
      this.tempHotspot = null;
    }
  }

  cancelHotspotCreation() {
    this.removeTempHotspot();
    console.log('Creación de hotspot cancelada');
  }

  private cartesianToSpherical(position: THREE.Vector3): { theta: number, phi: number } {
    const radius = position.length();
    const theta = Math.atan2(position.z, position.x) * (180 / Math.PI);
    const phi = Math.acos(position.y / radius) * (180 / Math.PI);
    return { theta, phi };
  }

  private getCameraOrientation(camera: THREE.PerspectiveCamera): number {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    return Math.atan2(direction.x, direction.z) * (180 / Math.PI);
  }

  private setOrientationQuaternion(
    quaternion: THREE.Quaternion,
    alpha: number,
    beta: number,
    gamma: number,
    orient: number
  ) {
    const zee = new THREE.Vector3(0, 0, 1);
    const euler = new THREE.Euler();
    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

    euler.set(beta, alpha, -gamma, 'YXZ');
    quaternion.setFromEuler(euler);
    quaternion.multiply(q1);
    quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
  }


  paintHotspot(hotspot: THREE.Mesh, type: string): void {
    let color: number;
    switch (type.toLowerCase()) {
      case 'hotspot':
        color = 0xffff00; // Amarillo
        break;
      case 'equipamiento':
        color = 0x00ff00; // Verde
        break;
      case 'saturado':
        color = 0xff0000; // Rojo
        break;
      case 'inclinado':
        color = 0x000000; // Negro
        break;
      default:
        color = 0xffffff; // Blanco por defecto
        break;
    }

    const material = hotspot.material as THREE.MeshBasicMaterial;
    material.color.set(color);

    console.log(`✅ Hotspot pintado de color ${color.toString(16)} por tipo '${type}'`);
  }
  public loadHotspotsForPanorama(panoramaId: number): void {
    console.log(`Cargando hotspots para panorama ${panoramaId}`);

    // Si es el mismo panorama, no recargar
    if (this.currentPanoramaId === panoramaId) {
      console.log('Panorama actual, omitiendo recarga de hotspots');
      return;
    }

    // Limpiar hotspots existentes
    this.clearCurrentHotspots();

    // Actualizar panorama actual
    this.currentPanoramaId = panoramaId;

    // Cargar hotspots específicos del panorama
    this.apiService.getPostesByPanorama(panoramaId).subscribe({
      next: (hotspots: Hotspot[]) => {
        if (this.scene && hotspots.length > 0) {
          console.log(`Cargando ${hotspots.length} hotspots para panorama ${panoramaId}`);
          hotspots.forEach(h => {
            this.addHotspot(this.scene!, h.theta, h.phi, 5, h);
          });
        } else {
          console.log(`No hay hotspots para panorama ${panoramaId}`);
        }
      },
      error: (error: any) => {
        console.error(`Error cargando hotspots para panorama ${panoramaId}:`, error);
      }
    });
  }
  private clearCurrentHotspots(): void {
    if (this.scene) {
      // Remover hotspots de la escena
      this.markers.forEach(marker => {
        this.scene!.remove(marker);
        if (marker.geometry) marker.geometry.dispose();
        if (marker.material) {
          if (Array.isArray(marker.material)) {
            marker.material.forEach(mat => mat.dispose());
          } else {
            marker.material.dispose();
          }
        }
      });
    }
    this.markers = [];
    this.selectedHotspot = null;

    console.log('Hotspots anteriores limpiados');
  }

  private disposeControls() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = undefined;
    }
  }


  // NUEVO MÉTODO: Limpiar sin afectar los mapas de colores
  private cleanupWithoutColorMaps() {
    // Limpiar event listeners de mouse
    if (this.clickHandler && this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('dblclick', this.clickHandler);
      this.clickHandler = undefined;
    }
    if (this.rightClickHandler && this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('contextmenu', this.rightClickHandler);
      this.rightClickHandler = undefined;
    }
    if (this.hoverHandler && this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('mousemove', this.hoverHandler);
      this.hoverHandler = undefined;
    }

    this.removeTempHotspot();

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }

    this.disposeControls();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }

    if (this.texture) {
      this.texture.dispose();
      this.texture = undefined;
    }

    if (this.apiService.selectedImageUrl instanceof ArrayBuffer && this.imageUrl) {
      URL.revokeObjectURL(this.imageUrl);
      this.imageUrl = undefined;
    }

    this.markers.forEach(marker => {
      if (marker.geometry) marker.geometry.dispose();
      if (marker.material) {
        if (Array.isArray(marker.material)) {
          marker.material.forEach(mat => mat.dispose());
        } else {
          marker.material.dispose();
        }
      }
    });
    this.markers = [];

    if (this.sphereMesh) {
      if (this.sphereMesh.geometry) this.sphereMesh.geometry.dispose();
      if (this.sphereMesh.material) {
        if (Array.isArray(this.sphereMesh.material)) {
          this.sphereMesh.material.forEach(mat => mat.dispose());
        } else {
          this.sphereMesh.material.dispose();
        }
      }
      this.sphereMesh = undefined;
    }

    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = undefined;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }

    if (this.changeModeButton) {
      const newButton = this.changeModeButton.cloneNode(true);
      this.changeModeButton.parentNode?.replaceChild(newButton, this.changeModeButton);
      this.changeModeButton = null;
    }

    if (this.scene) {
      this.scene.clear();
      this.scene = undefined;
    }

    this.camera = undefined;
    console.log('Recursos limpiados (conservando mapas de colores)');
  }

  public cleanup() {
    this.cleanupLevelingButtons(); // NUEVO
    this.cleanupWithoutColorMaps();
    this.hotspotColors.clear();
    this.hotspotTypes.clear();
    console.log('Recursos limpiados completamente (incluyendo botones de nivelación)');
  }

  // MÉTODO ACTUALIZADO: Crear hotspot key único
  private createHotspotKey(theta: number, phi: number, id?: number): string {
    // Si hay ID, usarlo como parte de la clave, sino usar coordenadas
    if (id !== undefined && id !== 0) {
      return `hotspot_${id}`;
    }
    return `hotspot_${theta.toFixed(2)}_${phi.toFixed(2)}`;
  }

  // MÉTODO ACTUALIZADO: addHotspot con persistencia de colores
  private addHotspot(scene: THREE.Scene, theta: number, phi: number, radius: number = 5, hotspotData?: Partial<Hotspot>) {
    const thetaRad = THREE.MathUtils.degToRad(theta);
    const phiRad = THREE.MathUtils.degToRad(phi);
    const x = radius * Math.sin(phiRad) * Math.cos(thetaRad);
    const y = radius * Math.cos(phiRad);
    const z = radius * Math.sin(phiRad) * Math.sin(thetaRad);

    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hotspot = new THREE.Mesh(geometry, material);
    hotspot.position.set(x, y, z);

    // Configurar userData
    hotspot.userData = {
      id: hotspotData?.id ?? 0,
      label: hotspotData?.condicion ?? `Hotspot θ=${theta}, φ=${phi}`,
      type_hotspot: hotspotData?.tipoPoste ?? 'equipamiento',
      theta,
      phi,
      ...hotspotData
    };

    // Crear clave única para ested hotspot
    const hotspotKey = this.createHotspotKey(theta, phi, hotspotData?.id);

    // APLICAR COLOR PERSISTENTE si existe
    const savedColor = this.hotspotColors.get(hotspotKey);
    const savedType = this.hotspotTypes.get(hotspotKey);

    if (savedColor !== undefined) {
      material.color.set(savedColor);
      console.log(`🎨 Aplicando color persistente ${savedColor.toString(16)} al hotspot ${hotspotKey}`);
    } else if (savedType) {
      // Si no hay color guardado pero sí tipo, aplicar color por tipo
      this.paintHotspot(hotspot, savedType);
    } else if (hotspotData?.tipoPoste) {
      // Si no hay datos guardados, aplicar color por tipo por defecto
      this.paintHotspot(hotspot, hotspotData.tipoPoste);
    }

    scene.add(hotspot);
    this.markers.push(hotspot);
    return hotspot;
  }

  private paintYellow(hotspot: THREE.Mesh) {
    return (hotspot.material as THREE.MeshBasicMaterial).color.set(0xffff00);
  }

  //Doble click al hotspot
  private onHotspotClick(hotspot: THREE.Mesh) {
    const label = (hotspot.userData as { label: string }).label;
    console.log('Hotspot seleccionado: amarillo', label);


    // Actualizar la referencia
    this.selectedHotspot = hotspot;

    const userData = hotspot.userData;

// **NUEVA VERSIÓN: Mapeo a la nueva interfaz Hotspot**
    const hotspotData: Hotspot = {
      id: userData['id'] ?? 0,
      item: userData['item'] ?? 0, // Nuevo campo
      codigoPosteAntiguo: userData['label'] ?? 'Sin etiqueta', // label -> codigoPosteAntiguo
      pitch: userData['pitch'] ?? 0,
      yaw: userData['yaw'] ?? 0,
      theta: userData['theta'] ?? 0,
      phi: userData['phi'] ?? 0,
      tipoPoste: userData['type_hotspot'] ?? 'Desconocido', // type_hotspot -> tipoPoste
      criticidad: userData['criticidad'] ?? 'Media', // Nuevo campo
      red: userData['red'] ?? 'Eléctrica', // Nuevo campo
      tipoRed: userData['tipoRed'] ?? 'Distribución', // Nuevo campo
      alturaSoporte: userData['alturaSoporte'] ?? 0, // Nuevo campo
      alturaVano: userData['alturaVano'] ?? 0, // Nuevo campo
      codigoDistrito: userData['codigoDistrito'] ?? '', // Nuevo campo
      tipoVia: userData['tipoVia'] ?? '', // Nuevo campo
      nombreVia: userData['title'] ?? '', // title -> nombreVia
      numero: userData['numero'] ?? '', // Nuevo campo
      manzana: userData['manzana'] ?? '', // Nuevo campo
      lote: userData['lote'] ?? '', // Nuevo campo
      coordenadas: userData['coordenadas'] ?? '', // Nuevo campo
      latitudS: userData['latitudS'] ?? '', // Nuevo campo
      longitudW: userData['longitudW'] ?? '', // Nuevo campo
      urbanizacion: userData['urbanizacion'] ?? '', // Nuevo campo
      posteSiguiente: userData['posteSiguiente'] ?? '', // Nuevo campo
      observacion1: userData['description'] ?? '', // description -> observacion1
      observacion2: userData['observacion2'] ?? '', // Nuevo campo
      observacion3: userData['observacion3'] ?? '', // Nuevo campo
      condicion: userData['state'] === 1 ? 'Activo' : 'Inactivo', // state -> condicion (mapeado)
      trabajoARealizar: userData['text'] ?? '', // text -> trabajoARealizar
      panoramasId: userData['panoramasId'] ?? 0,
      viewCapturePath: userData['viewCapturePath'] ? parseInt(userData['viewCapturePath']) : 0, // Asegurar número
      filePath1: userData['filePath'] ?? '', // filePath -> filePath1
      filePath2: userData['filePath2'] ?? '', // Nuevo campo
      filePath3: userData['filePath3'] ?? '' // Nuevo campo
    };

    try {
      const openBar = this.openHotspotService.openBar(hotspotData);

      console.log('Hotspot seleccionado: amarillo', openBar);
    } catch (error) {
      console.error('Error al abrir el bar con los datos del hotspot:', error);
    }
  }

  async updatePanoramaTexture(imageUrl: string, panoramaId?: number): Promise<void> {
    console.log('[VrThreeService] Actualizando textura del panorama:', imageUrl);

    if (!this.scene || !this.sphereMesh) {
      console.warn('[VrThreeService] Escena o esfera no inicializada, creando nueva escena');
      this.createScene();
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    this.showLoader();

    return new Promise((resolve, reject) => {
      textureLoader.load(
        imageUrl,
        async (texture) => {
          console.log('[VrThreeService] Nueva textura cargada exitosamente');

          if (this.sphereMesh && this.sphereMesh.material) {
            const material = Array.isArray(this.sphereMesh.material)
              ? this.sphereMesh.material[0]
              : this.sphereMesh.material;

            // Limpiar textura anterior
            if ((material as THREE.MeshBasicMaterial).map) {
              (material as THREE.MeshBasicMaterial).map!.dispose();
            }

            // Aplicar nueva textura
            (material as THREE.MeshBasicMaterial).map = texture;
            material.needsUpdate = true;
          }

          this.hideLoader();

          // IMPORTANTE: Cargar y aplicar nivelación automáticamente
          if (panoramaId !== undefined) {
            this.currentPanoramaId = panoramaId;

            // Primero resetear la rotación de la esfera
            this.sphereMesh!.rotation.set(0, 0, 0);

            // Luego cargar y aplicar la nivelación guardada
            await this.loadAndApplyLeveling(panoramaId);

            // Cargar hotspots después de aplicar nivelación
            this.loadHotspotsForPanorama(panoramaId);
          }

          // Render final
          if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
          }

          console.log('[VrThreeService] Panorama cargado con nivelación aplicada');
          resolve();
        },
        (progress) => {
          console.log('[VrThreeService] Progreso de carga:', progress);
        },
        (error) => {
          console.error('[VrThreeService] Error al cargar nueva textura:', error);
          this.hideLoader();
          reject(error);
        }
      );
    });
  }

  public getCurrentPanoramaId(): number | null {
    return this.currentPanoramaId;
  }

  // MÉTODO PÚBLICO: Resetear panorama actual
  public resetCurrentPanorama(): void {
    this.currentPanoramaId = null;
  }

  private showLoader(): void {
    console.log('[VrThreeService] Mostrando loader...');
  }

  private hideLoader(): void {
    console.log('[VrThreeService] Ocultando loader...');
  }

  ngOnDestroy() {
    this.cleanup();
  }
}
