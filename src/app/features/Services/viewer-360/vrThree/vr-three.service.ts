import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ApiService } from "../api/api.service";
import { Hotspot } from "../../../Model/types";
import {WebGLRenderer} from "three";
import { ModalService} from "../modal/modal.service";
import {Subject} from "rxjs";
import {OpenHotspotService} from "../openHotspot/open-hotspot.service";
import {PanoramaSyncService} from "../../panorama-sync/panorama-sync.service";

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

  constructor(
    private apiService: ApiService,
    private modalService: ModalService,
    private openHotspotService: OpenHotspotService,
    private panoramaSyncService: PanoramaSyncService
  ) {
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

  private startAnimation() {
    if (!this.scene || !this.camera) {
      console.error('No hay escena o cámara disponible para iniciar la animación');
      return;
    }

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (this.orbitControlMode && this.controls) {
        this.controls.update();
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
    console.log('Animación iniciada');
    const panoramaId = this.panoramaSyncService.getCurrentPanoramaIdSync();

    if (panoramaId === null) {
      console.warn('[VR Component] No hay panoramaId actual, no se pueden cargar hotspots');
      return;
    }

    this.apiService.getPostesByPanorama(panoramaId).subscribe((hotspots: Hotspot[]) => {
      console.log('Lista de hotspots para pintado: ', hotspots);
      if (this.scene) {
        hotspots.forEach(h => {
          console.log('Tipo de hotspot recibido:', h.tipoPoste);  // <--- Esto
          const mesh = this.addHotspot(this.scene!, h.theta, h.phi, 5, h);
          this.paintHotspot(mesh, h.tipoPoste || '');
        });
      }
    })  ;

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
    this.cleanupWithoutColorMaps();

    // Limpiar también los mapas de colores
    this.hotspotColors.clear();
    this.hotspotTypes.clear();

    console.log('Recursos limpiados completamente (incluyendo mapas de colores)');
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

  updatePanoramaTexture(imageUrl: string, panoramaId?: number): void {
    console.log('[VrThreeService] Actualizando textura del panorama:', imageUrl);

    if (!this.scene || !this.sphereMesh) {
      console.warn('[VrThreeService] Escena o esfera no inicializada, creando nueva escena');
      this.createScene();
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    this.showLoader();

    textureLoader.load(
      imageUrl,
      (texture) => {
        console.log('[VrThreeService] Nueva textura cargada exitosamente');
        if (this.sphereMesh && this.sphereMesh.material) {
          const material = Array.isArray(this.sphereMesh.material)
            ? this.sphereMesh.material[0]
            : this.sphereMesh.material;
          if ((material as THREE.MeshBasicMaterial).map) {
            (material as THREE.MeshBasicMaterial).map!.dispose();
          }
          (material as THREE.MeshBasicMaterial).map = texture;
          material.needsUpdate = true;
        }
        this.hideLoader();

        // NUEVA PARTE: Cargar hotspots específicos si se proporciona panoramaId
        if (panoramaId !== undefined) {
          this.loadHotspotsForPanorama(panoramaId);
        }

        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      },
      (progress) => {
        console.log('[VrThreeService] Progreso de carga:', progress);
      },
      (error) => {
        console.error('[VrThreeService] Error al cargar nueva textura:', error);
        this.hideLoader();
      }
    );
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
