import { Component, OnInit, OnDestroy, Input, ElementRef, AfterViewInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { OpenHotspotService } from '../../../Services/viewer-360/openHotspot/open-hotspot.service';
import {Hotspot, Panorama} from "../../../Model/types";
import * as THREE from 'three';
import {VrThreeService} from "../../../Services/viewer-360/vrThree/vr-three.service";
import {ApiService} from "../../../Services/viewer-360/api/api.service";
import {PanoramaSyncService} from "../../../Services/panorama-sync/panorama-sync.service";
import {EndpointService} from "../../../Services/endpoint/endpoint.service";
import * as XLSX from 'xlsx';
import {HighlightService} from "../../../Services/highlight/highlight.service";

@Component({
  selector: 'app-open-hotspot',
  templateUrl: './open-hotspot.component.html',
  styleUrls: ['./open-hotspot.component.scss'],
  animations: [
    trigger('slideIn', [
      state('in', style({transform: 'translateX(0)'})),
      transition('void => *', [
        style({transform: 'translateX(100%)'}),
        animate(300)
      ]),
      transition('* => void', [
        animate(300, style({transform: 'translateX(100%)'}))
      ])
    ])
  ]
})
export class OpenHotspotComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() color: number = 0xffff00;
  currentPanoramaId: number | null = null;
  longitude: number | null = null;
  latitude: number | null = null;
  showAdvanced = false;
  selectedFiles: File[] = [];
  uploadedImagePreviews: string[] = [];
  highlightedPanoramaIds: Set<number> = new Set();
  getHotspotByPanorama: Hotspot [] = [] ;
  selectedImage: File | null = null;  // Solo una imagen
  imagePreview: string | null = null; // Vista previa
  uploading = false;
  private mesh!: THREE.Mesh;
  visible = false;
  private subscription: Subscription = new Subscription();
  private closeSubscription?: Subscription;

  modalData: Hotspot = {
    id: 0,
    item: 0, // Nuevo campo
    codigoPosteAntiguo: '', // Reemplaza label
    pitch: 0,
    yaw: 0,
    theta: 0,
    phi: 0,
    tipoPoste: '', // Reemplaza typeHotspot (valor por defecto diferente)
    criticidad: '', // Nuevo campo
    red: '', // Nuevo campo
    tipoRed: '', // Nuevo campo
    alturaSoporte: 0, // Nuevo campo
    alturaVano: 0, // Nuevo campo
    codigoDistrito: '', // Nuevo campo
    tipoVia: '', // Nuevo campo
    nombreVia: '', // Reemplaza title
    numero: '', // Nuevo campo
    manzana: '', // Nuevo campo
    lote: '', // Nuevo campo
    coordenadas: '', // Nuevo campo
    latitudS: '', // Nuevo campo
    longitudW: '', // Nuevo campo
    urbanizacion: '', // Nuevo campo
    posteSiguiente: '', // Nuevo campo
    observacion1: '', // Reemplaza description
    observacion2: '', // Nuevo campo
    observacion3: '', // Nuevo campo
    condicion: 'Inactivo', // Reemplaza state (mapeado a texto)
    trabajoARealizar: '', // R3eemplaza text
    panoramasId: 0,
    viewCapturePath: 0, // Ahora es número
    filePath1: '', // Reemplaza filePath
    filePath2: '', // Nuevo campo
    filePath3: '', // Nuevo campo
  };

  constructor(
    private el: ElementRef,
    private openHotspot: OpenHotspotService,
    private vrThreeService : VrThreeService,
    private apiService: ApiService,
    private panoramaSyncService: PanoramaSyncService,
    private endpointService: EndpointService,
    private highlightService: HighlightService
  ) {
    console.log('OpenHotspotComponent → constructor() ejecutado');
  }

  ngAfterViewInit(): void {
    this.createHotspot();
    this.vrThreeService.paintHotspot(this.mesh, this.modalData.tipoPoste);
  }


  private createHotspot(): void {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);
    console.log('Hotspot creado', this.mesh);
  }


  public updateColor(newColor: number): void {
    if (this.mesh && this.mesh.material instanceof THREE.MeshBasicMaterial) {
      this.mesh.material.color.set(newColor);
    }
  }

  ngOnInit() {
    console.log('OpenHotspotComponent → ngOnInit()');
    this.subscription.add(
      this.panoramaSyncService.getCurrentPanoramaId().subscribe((id ) => {
        this.currentPanoramaId = id;
        console.log('Panorama ID actualizado:', id);
      })
    );
    if (this.currentPanoramaId !== null) {
      this.subscription.add(
        this.apiService.getPanoramaById(this.currentPanoramaId).subscribe(response => {
          this.latitude = response.data.latitude;
          this.longitude = response.data.longitude;
        })
      )
    }

    this.subscription = this.openHotspot.openModal$.subscribe((data: Hotspot) => {
      console.log('openModal$ → Datos recibidos:', data);
      this.modalData = { ...data }; // Spread operator for immutability
      this.visible = true;
      console.log('Estado actualizado → visible =', this.visible);
    });

    // Listen for close events if the service provides them
    this.closeSubscription = this.openHotspot.closeModal$?.subscribe(() => {
      this.closeBar();
    });
  }

  ngOnDestroy() {
    console.log('OpenHotspotComponent → ngOnDestroy()');
    this.subscription?.unsubscribe();
    this.closeSubscription?.unsubscribe();
    console.log('Suscripciones canceladas correctamente');
  }
  private getColorFromType(type: string): number {
    switch (type) {
      case 'hostpot':
        return 0xffff00; // Amarillo
      case 'equipamiento':
        return 0x00ff00; // Verde
      case 'saturado':
        return 0xff0000; // Rojo
      case 'inclinado':
        return 0x000000;
      default:
        return 0xffffff; // Blanco por defecto
    }
  }
  saveHotspot() {
    // Validar datos requeridos
    if (!this.modalData.codigoPosteAntiguo || !this.modalData.tipoPoste) {
      console.error('Campos requeridos faltantes');
      return;
    }

    // Preparar el objeto según lo espera la API
    const posteToSave = {
      id: this.modalData.id || 0,
      item: this.modalData.item?.toString() || '0', // Asegurar string
      codigoPosteAntiguo: this.modalData.codigoPosteAntiguo,
      pitch: Number(this.latitude) || 0,
      yaw: Number(this.longitude) || 0,
      theta: Number(this.modalData.theta) || 0,
      phi: Number(this.modalData.phi) || 0,
      tipoPoste: this.modalData.tipoPoste,
      criticidad: this.modalData.criticidad || 'Media',
      red: this.modalData.red || 'Eléctrica',
      tipoRed: this.modalData.tipoRed || 'Distribución',
      alturaSoporte: Number(this.modalData.alturaSoporte) || 0,
      alturaVano: Number(this.modalData.alturaVano) || 0,
      codigoDistrito: this.modalData.codigoDistrito || '',
      tipoVia: this.modalData.tipoVia || 'Calle',
      nombreVia: this.modalData.nombreVia || '',
      numero: this.modalData.numero || 'S/N',
      manzana: this.modalData.manzana || '',
      lote: this.modalData.lote || '',
      coordenadas: this.modalData.coordenadas || '',
      latitudS: this.latitude?.toString() || '', // asegurar string
      longitudW: this.longitude?.toString() || '',
      urbanizacion: this.modalData.urbanizacion || '',
      posteSiguiente: this.modalData.posteSiguiente || '',
      observacion1: this.modalData.observacion1 || '',
      observacion2: this.modalData.observacion2 || '',
      observacion3: this.modalData.observacion3 || '',
      condicion: this.modalData.condicion || 'Inactivo',
      trabajoARealizar: this.modalData.trabajoARealizar || '',
      panoramasId: Number(this.currentPanoramaId) || 0,
      viewCapturePath: Number(this.modalData.viewCapturePath) || 0,
      filePath1: this.modalData.filePath1 || '',

    };

      console.log('Datos a enviar:', JSON.stringify(posteToSave, null, 2));


    this.apiService.postPoste(posteToSave).subscribe({

      next: (response) => {

        this.uploadFiles();
        console.log('Poste guardado correctamente', response);
        this.closeBar();
        if (this.currentPanoramaId  ) {
          const updatePayload = {
            id: this.currentPanoramaId,
            hasHotspots:  1
          };

          this.apiService.updatePanoramaHasHotspot(updatePayload).subscribe({

            next: () => {
              console.log('Panorama actualizado exitosamente:', response);
            },
            error: err => {
              if (err.error && err.error.errors) {
                console.error('Errores de validación:', err.error.errors);
              }
            }
          });
        }
        // Actualizar el color del hotspot si es necesario
        if (this.currentPanoramaId) {
          this.vrThreeService.paintHotspot(this.mesh, this.modalData.tipoPoste);
        }
      },
      error: (err) => {
        console.error('Error al guardar poste:', {
          status: err.status,
          error: err.error,
          url: err.url
        });

        // Mostrar detalles de validación si es error 400
        if (err.status === 400 && err.error.errors) {
          const errorMessages = Object.entries(err.error.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`);
          console.error('Errores de validación:', errorMessages.join('\n'));
        }
      }
    });
  }

  getHotspotComplete(){

  }
  changeState() {

  }


  closeBar() {
    console.log('closeBar() llamado — cerrando panel');

    if (this.vrThreeService.selectedHotspot) {
      this.vrThreeService.paintHotspot(this.vrThreeService.selectedHotspot, this.modalData.tipoPoste);
    } else {
      console.warn('⚠️ No hay hotspot seleccionado para pintar');
    }
    this.visible = false;
    this.openHotspot.notifyModalClosed?.();
    console.log('Color Seleccionado', this.modalData.tipoPoste);
  }

  private generateImagePreviews2(): void {
    this.uploadedImagePreviews = [];
    this.selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            this.uploadedImagePreviews.push(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
  private generateImagePreviews(): void {
    this.uploadedImagePreviews = [];

    this.selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            this.uploadedImagePreviews.push(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
  onFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.selectedFiles = Array.from(target.files);
      this.generateImagePreviews();

      // Actualizar las rutas de archivos en modalData
      this.updateFilePathsFromSelection();
    }
  }
  removeExistingFile(fileNumber: 1 | 2 | 3): void {
    switch (fileNumber) {
      case 1:
        this.modalData.filePath1 = '';
        break;
      case 2:
        this.modalData.filePath2 = '';
        break;
      case 3:
        this.modalData.filePath3 = '';
        break;
    }
  }
  viewFile(filePath: string): void {
    if (filePath) {
      // Aquí implementarías la lógica para abrir/ver el archivo
      // Por ejemplo, abrirlo en una nueva ventana o modal
      console.log('Visualizando archivo:', filePath);

      // Ejemplo: si es una URL completa
      if (filePath.startsWith('http')) {
        window.open(filePath, '_blank');
      } else {
        // Si es una ruta relativa, construir la URL completa
        // Ajusta según tu servicio

      }
    }
  }
  onFileSelect2(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.selectedFiles = Array.from(target.files);
      this.generateImagePreviews();
      // Actualizar la ruta del archivo en modalData si solo hay un archivo
      if (this.selectedFiles.length === 1) {
        this.modalData.filePath1 = this.selectedFiles[0].name;
      }
    }
  }
  private uploadFiles(): void {
    if (this.selectedFiles.length === 0) return;

    const formData = new FormData();
    formData.append('file', this.selectedFiles[0], this.selectedFiles[0].name);
    formData.append('tags', 'string');
    formData.append('createdBy', 'string');
    console.log('Archivo subido correctamente', this.selectedFiles[0].type);

    this.apiService.uploadFile(formData).subscribe({
      next: (response) => {
        console.log('Archivo subido correctamente', response);
        console.log('Archivo subido correctamente', this.selectedFiles[0].type);
        this.closeBar();
      },
      error: (err) => {
        console.error('Error al subir archivo:', err);
        console.log('Archivo subido correctamente', this.selectedFiles[0].type);
      }
    });
  }

  isFormValid(): boolean {
    return !!(this.modalData.codigoPosteAntiguo?.trim() &&
      (this.modalData.filePath1?.trim() || this.selectedFiles.length > 0));
  }

  private saveHotspotData(hotspotData: any): void {
    this.apiService.postHotspot(hotspotData).subscribe({
      next: () => {
        console.log('Hotspot guardado correctamente');
        this.closeBar();
      },
      error: (err) => {
        console.error('Error al guardar el hotspot:', err);
      }
    });
  }

  // Helper method to format date
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  // Helper method to format coordinates
  formatCoordinate(coord: number): string {
    return coord ? coord.toFixed(6) : 'N/A';
  }

  // Helper method to get full address
  /*
  getFullAddress(): string {
    const parts = [
      this.modalData.street_name,
      this.modalData.street_number,
      this.modalData.locality,
      this.modalData.province
    ].filter(part => part && part.trim());
    return parts.join(', ') || 'Dirección no disponible';
  }
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  private updateFilePathsFromSelection(): void {
    // Limpiar rutas existentes
    this.modalData.filePath1 = '';
    this.modalData.filePath2 = '';
    this.modalData.filePath3 = '';

    // Asignar nuevas rutas basadas en archivos seleccionados
    this.selectedFiles.forEach((file, index) => {
      if (index === 0) this.modalData.filePath1 = file.name;
      else if (index === 1) this.modalData.filePath2 = file.name;
      else if (index === 2) this.modalData.filePath3 = file.name;
    });
  }

    onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.selectedImage = input.files[0];

      // Generar vista previa
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreview = e.target?.result as string;
      reader.readAsDataURL(this.selectedImage);

      // Limpiar selección anterior si hay más de un archivo
      if (input.files.length > 1) {
        console.warn('Solo se permite una imagen. Se usará la primera seleccionada.');
      }
    }
  }
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.generateImagePreviews();
    this.updateFilePathsFromSelection();
  }
  hasExistingFiles(): boolean {
    return !!(this.modalData.filePath1 || this.modalData.filePath2 || this.modalData.filePath3);
  }


}
