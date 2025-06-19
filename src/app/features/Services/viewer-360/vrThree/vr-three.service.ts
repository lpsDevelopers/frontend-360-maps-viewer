import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ApiService } from "../api/api.service";
import { Hotspot } from "../../../Model/types";
import {WebGLRenderer} from "three";
import {ModalService} from "../modal/modal.service";
import {Subject} from "rxjs";

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
  private rightClickHandler: ((event: MouseEvent) => void) | undefined; // Nuevo handler
  private resizeHandler: (() => void) | undefined;
  private animationId: number | undefined;
  private tooltipCallback?: (x: number, y: number, label: string) => void;
  private hoverHandler?: (event: MouseEvent) => void;
  private selectedHotspot: THREE.Mesh | null = null;
  private sphereClickSubject = new Subject<{position: THREE.Vector3, cameraOrientation: number}>();
  public sphereClick$ = this.sphereClickSubject.asObservable();

  // Variables para el modo de creación de hotspots
  private creationMode = false;
  private tempHotspot: THREE.Mesh | null = null;

  constructor(private apiService: ApiService, private modalService: ModalService) {
    this.renderer = new WebGLRenderer();
  }

  // Método para activar/desactivar modo de creación
  toggleCreationMode(enabled: boolean) {
    this.creationMode = enabled;
    console.log('Modo creación de hotspots:', this.creationMode ? 'activado' : 'desactivado');

    if (!enabled && this.tempHotspot) {
      // Si desactivamos el modo y hay un hotspot temporal, lo removemos
      this.removeTempHotspot();
    }
  }

  createScene() {
    console.log('Creando escena 3D...');
    this.isLoading = true;
    // Limpiar recursos previos
    this.cleanup();
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
      // Crear la esfera después de cargar la textura
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
    // Limpiar contenedor antes de añadir nuevo renderer
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
    // Limpiar esfera existente si hay una
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
    this.controls.addEventListener('change', () => {
    });
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

    this.rightClickHandler = ( event: MouseEvent)=> {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Primero, comprobar si clickeamos un hotspot existente
      const intersectsHotspots = raycaster.intersectObjects(this.markers);
      if (intersectsHotspots.length > 0) {
        this.modalService.openModal$.subscribe(isOpen => {
          if (isOpen) {
            // Modal abierto: remover hover y ocultar tooltip
            if (this.hoverHandler && this.renderer?.domElement) {
              this.renderer.domElement.removeEventListener('mousemove', this.hoverHandler);
            }
            if (this.tooltipCallback) {
              this.tooltipCallback(0, 0, ''); // ocultar tooltip
            }
          } else {
            // Modal cerrado: volver a añadir hover
            if (this.hoverHandler && this.renderer?.domElement) {
              this.renderer.domElement.addEventListener('mousemove', this.hoverHandler);
            }
          }
        });
        const hotspot = intersectsHotspots[0].object;
        console.log('HostPot Seleccionado: ', hotspot);
        // En lugar del alert, abres el modal con datos del hotspot
        this.modalService.openModal({
          id: hotspot.userData['id'] ?? 0,
          label: hotspot.userData['label'] ?? 'Sin etiqueta',
          description: hotspot.userData['description'] ?? '',
          locationId: hotspot.userData['locationId'] ?? 0,
          equipment_location: hotspot.userData['equipment_location'] ?? '',
          street_name: hotspot.userData['street_name'] ?? '',
          street_number: hotspot.userData['street_number'] ?? '',
          province: hotspot.userData['province'] ?? '',
          locality: hotspot.userData['locality'] ?? '',
          postal_code: hotspot.userData['postal_code'] ?? '',
          identifier: hotspot.userData['identifier'] ?? '',
          project: hotspot.userData['project'] ?? '',
          new_equipment_location: hotspot.userData['new_equipment_location'] ?? '',
          assigned_to: hotspot.userData['assigned_to'] ?? '',
          location_details: hotspot.userData['location_details'] ?? '',
          repair_type: hotspot.userData['repair_type'] ?? '',
          repair_type_2: hotspot.userData['repair_type_2'] ?? '',
          registration_date: hotspot.userData['registration_date'] ?? '',
          latitude: hotspot.userData['latitude'] ?? 0,
          longitude: hotspot.userData['longitude'] ?? 0,
          additional_notes: hotspot.userData['additional_notes'] ?? '',
          other_repair_type_1: hotspot.userData['other_repair_type_1'] ?? '',
          other_repair_type_2: hotspot.userData['other_repair_type_2'] ?? '',
          theta: hotspot.userData['theta'] ?? 0,
          phi: hotspot.userData['phi'] ?? 0,
        });
        return;
      }


      // Si no clickeamos un hotspot, comprobar si clickeamos la esfera
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

        // Calcular phi y theta desde (x,y,z)
        const phi = THREE.MathUtils.radToDeg(Math.acos(y / radius));
        const theta = THREE.MathUtils.radToDeg(Math.atan2(z, x));

        // Crear el hotspot en la escena
        this.addHotspot(this.scene!, theta, phi, radius);
      }
    }
    // Handler para click izquierdo (funcionalidad existente)
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

    // Nuevo handler para click derecho


    // Añadir los event listeners
    if (this.renderer) {
      this.renderer.domElement.addEventListener('contextmenu', this.rightClickHandler, true);
      this.renderer.domElement.addEventListener('dblclick', this.clickHandler);

      this.renderer.domElement.addEventListener('contextmenu', (e) => {
        console.log('✅ Canvas recibió click derecho');
      }, true)

      console.log('Click deerecho', this.rightClickHandler);
      // Handler para hover (funcionalidad existente)
      let lastHoveredHotspot: THREE.Object3D | null = null;
      this.hoverHandler = (event: MouseEvent) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(this.markers);

        if (intersects.length > 0) {
          const hovered = intersects[0].object;
          if (hovered !== lastHoveredHotspot) {
            lastHoveredHotspot = hovered;
            const label = hovered.userData['label'] || 'Hotspot sin etiqueta';
            if (this.tooltipCallback) {
              this.tooltipCallback(event.clientX + 10, event.clientY + 10, label);
            }
          } else {
            if (this.tooltipCallback) {
              this.tooltipCallback(event.clientX + 10, event.clientY + 10, hovered.userData['label']);
            }
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

    // Resto de configuración de event listeners (sin cambios)...
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

  // Nuevo método para crear hotspot temporal
  private openHotspot(position: THREE.Vector3) {
    if (!this.scene) return;

    // Remover hotspot temporal anterior si existe
    this.removeTempHotspot();

    // Calcular theta y phi desde la posición
    const { theta, phi } = this.cartesianToSpherical(position);

    // Crear hotspot temporal con color diferente (amarillo para indicar que es temporal)
    const geometry = new THREE.SphereGeometry(0.12, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00, // Amarillo para hotspot temporal
      transparent: true,
      opacity: 0.8
    });

    this.tempHotspot = new THREE.Mesh(geometry, material);
    this.tempHotspot.position.copy(position);
    this.tempHotspot.userData = {
      label: 'Nuevo Hotspot',
      theta: theta,
      phi: phi,
      isTemp: true
    };

    this.scene.add(this.tempHotspot);

    // Abrir modal para configurar el hotspot
    this.openHotspotModal(theta, phi);

    console.log(`Hotspot temporal creado en θ=${theta.toFixed(2)}°, φ=${phi.toFixed(2)}°`);
  }

  // Método para remover hotspot temporal
  private removeTempHotspot() {
    if (this.tempHotspot && this.scene) {
      this.scene.remove(this.tempHotspot);
      this.tempHotspot.geometry.dispose();
      (this.tempHotspot.material as THREE.MeshBasicMaterial).dispose();
      this.tempHotspot = null;
    }
  }

  // Método para confirmar la creación del hotspot
  confirmHotspotCreation(hotspotData: any) {
    if (!this.tempHotspot || !this.scene) return;

    // Convertir el hotspot temporal en permanente
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Rojo para hotspot permanente

    const permanentHotspot = new THREE.Mesh(geometry, material);
    permanentHotspot.position.copy(this.tempHotspot.position);
    permanentHotspot.userData = {
      label: hotspotData.label || 'Nuevo Hotspot',
      theta: this.tempHotspot.userData['theta'],
      phi: this.tempHotspot.userData['phi'],
      id: hotspotData.id || Date.now() // ID temporal si no viene del backend
    };

    // Remover temporal y añadir permanente
    this.removeTempHotspot();
    this.scene.add(permanentHotspot);
    this.markers.push(permanentHotspot);

    console.log('Hotspot creado permanentemente:', permanentHotspot.userData);
  }

  // Método para cancelar la creación del hotspot
  cancelHotspotCreation() {
    this.removeTempHotspot();
    console.log('Creación de hotspot cancelada');
  }

  // Método para abrir modal de configuración
  private openHotspotModal(theta: number, phi: number) {
    const modalData = {
      id: 0,
      label: '',
      description: '',
      locationId: 0,
      equipment_location: '',
      street_name: '',
      street_number: '',
      province: '',
      locality: '',
      postal_code: '',
      identifier: '',
      project: '',
      new_equipment_location: '',
      assigned_to: '',
      location_details: '',
      repair_type: '',
      repair_type_2: '',
      registration_date: '',
      latitude: 0,
      longitude: 0,
      additional_notes: '',
      other_repair_type_1: '',
      other_repair_type_2: '',
      theta: theta,
      phi: phi,
    };

    this.modalService.openModal(modalData);
  }

  // Método utilitario para convertir coordenadas cartesianas a esféricas
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
    // Cargar hotspots desde el API
    this.apiService.getHotspots().subscribe((hotspots: Hotspot[]) => {
      if (this.scene) {
        hotspots.forEach(h => this.addHotspot(this.scene!, h.theta, h.phi));
      }
    });
  }

  private disposeControls() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = undefined;
    }
  }

  public cleanup() {
    // Limpiar event listeners de mouse
    if (this.clickHandler && this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('dblclick', this.clickHandler);
      this.clickHandler = undefined;
    }

    if (this.rightClickHandler && this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('contextmenu', this.rightClickHandler);
      this.rightClickHandler = undefined;
    }

    if (this.hoverHandler && this.renderer?.domElement ) {
      this.renderer.domElement.removeEventListener('mousemove', this.hoverHandler);
      this.hoverHandler = undefined;
    }

    // Remover hotspot temporal si existe
    this.removeTempHotspot();

    // Cancelar animación
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }

    // Limpiar controles
    this.disposeControls();

    // Limpiar renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }

    // Limpiar textura
    if (this.texture) {
      this.texture.dispose();
      this.texture = undefined;
    }

    // Limpiar URL de blob si corresponde
    if (this.apiService.selectedImageUrl instanceof ArrayBuffer && this.imageUrl) {
      URL.revokeObjectURL(this.imageUrl);
      this.imageUrl = undefined;
    }

    // Limpiar markers
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

    // Limpiar esfera
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

    // Remover event listeners de window
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = undefined;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }

    // Limpiar botón de cambio de modo
    if (this.changeModeButton) {
      const newButton = this.changeModeButton.cloneNode(true);
      this.changeModeButton.parentNode?.replaceChild(newButton, this.changeModeButton);
      this.changeModeButton = null;
    }

    // Limpiar escena
    if (this.scene) {
      this.scene.clear();
      this.scene = undefined;
    }

    this.camera = undefined;
    console.log('Recursos limpiados completamente');
  }

  private addHotspot(scene: THREE.Scene, theta: number, phi: number, radius: number = 5) {
    const thetaRad = THREE.MathUtils.degToRad(theta);
    const phiRad = THREE.MathUtils.degToRad(phi);

    const x = radius * Math.sin(phiRad) * Math.cos(thetaRad);
    const y = radius * Math.cos(phiRad);
    const z = radius * Math.sin(phiRad) * Math.sin(thetaRad);

    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const hotspot = new THREE.Mesh(geometry, material);

    hotspot.position.set(x, y, z);
    hotspot.userData = { label: `Hotspot θ=${theta}, φ=${phi}` };

    scene.add(hotspot);
    this.markers.push(hotspot);
  }

  //Doble click al hotspot
  private onHotspotClick(hotspot: THREE.Mesh) {
    const label = (hotspot.userData as { label: string }).label;
    console.log('Hotspot seleccionado:', label);
    // Restaurar color del hotspot previamente seleccionado
    if (this.selectedHotspot && this.selectedHotspot !== hotspot) {
      (this.selectedHotspot.material as THREE.MeshBasicMaterial).color.set(0xff0000);
    }
    // Pintar el nuevo hotspot como seleccionado
    (hotspot.material as THREE.MeshBasicMaterial).color.set(0xffff00);
    // Actualizar la referencia
    this.selectedHotspot = hotspot;
  }

  updatePanoramaTexture(imageUrl: string): void {
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
