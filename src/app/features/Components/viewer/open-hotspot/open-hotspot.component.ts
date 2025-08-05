import { Component, OnInit, OnDestroy, Input, ElementRef, AfterViewInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { OpenHotspotService } from '../../../Services/viewer-360/openHotspot/open-hotspot.service';
import { Hotspot, Panorama } from "../../../Model/types";
import * as THREE from 'three';
import { VrThreeService } from "../../../Services/viewer-360/vrThree/vr-three.service";
import { ApiService } from "../../../Services/viewer-360/api/api.service";
import { PanoramaSyncService } from "../../../Services/panorama-sync/panorama-sync.service";
import { EndpointService } from "../../../Services/endpoint/endpoint.service";
import * as XLSX from 'xlsx';
import { HighlightService } from "../../../Services/highlight/highlight.service";

interface UploadFileResponse {
  id: string;
  fileName: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
  tags: string | null;
  s3Bucket: string;
  s3Key: string;
}

interface UploadProgress {
  fileIndex: number;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

@Component({
  selector: 'app-open-hotspot',
  templateUrl: './open-hotspot.component.html',
  styleUrls: ['./open-hotspot.component.scss'],
  animations: [
    trigger('slideIn', [
      state('in', style({ transform: 'translateX(0)' })),
      transition('void => *', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
      transition('* => void', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition('void => *', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class OpenHotspotComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() color: number = 0xffff00;

  // Estados principales
  currentPanoramaId: number | null = null;
  longitude: number | null = null;
  latitude: number | null = null;
  visible = false;
  uploading = false;
  saving = false;

  // Gestión de archivos mejorada
  selectedFiles: File[] = [];
  uploadedImagePreviews: string[] = [];
  uploadProgress: UploadProgress[] = [];
  maxFiles = 3;
  maxFileSize = 10 * 1024 * 1024; // 10MB
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  // Estados de validación
  validationErrors: string[] = [];
  showValidation = false;

  // Three.js
  private mesh!: THREE.Mesh;

  // Observables
  private subscription: Subscription = new Subscription();
  private closeSubscription?: Subscription;

  // Datos del formulario
  modalData: Hotspot = {
    id: 0,
    item: 0,
    codigoPosteAntiguo: '',
    pitch: 0,
    yaw: 0,
    theta: 0,
    phi: 0,
    tipoPoste: '',
    criticidad: 'Media',
    red: 'Eléctrica',
    tipoRed: 'Distribución',
    alturaSoporte: 0,
    alturaVano: 0,
    codigoDistrito: '',
    tipoVia: 'Calle',
    nombreVia: '',
    numero: 'S/N',
    manzana: '',
    lote: '',
    coordenadas: '',
    latitudS: '',
    longitudW: '',
    urbanizacion: '',
    posteSiguiente: '',
    observacion1: '',
    observacion2: '',
    observacion3: '',
    condicion: 'Inactivo',
    trabajoARealizar: '',
    panoramasId: 0,
    viewCapturePath: 0,
    filePath1: '',
    filePath2: '',
    filePath3: '',
  };

  constructor(
    private el: ElementRef,
    private openHotspot: OpenHotspotService,
    private vrThreeService: VrThreeService,
    private apiService: ApiService,
    private panoramaSyncService: PanoramaSyncService,
    private endpointService: EndpointService,
    private highlightService: HighlightService
  ) {
    console.log('🏗️ OpenHotspotComponent → Constructor inicializado');
  }

  ngAfterViewInit(): void {
    this.createHotspot();
    this.vrThreeService.paintHotspot(this.mesh, this.modalData.tipoPoste);
  }

  ngOnInit() {
    console.log('🚀 OpenHotspotComponent → Inicializando...');

    // Suscribirse al panorama actual
    this.subscription.add(
      this.panoramaSyncService.getCurrentPanoramaId().subscribe((id) => {
        this.currentPanoramaId = id;
        console.log('📍 Panorama ID actualizado:', id);
        this.loadPanoramaCoordinates();
      })
    );

    // Suscribirse a la apertura del modal
    this.subscription.add(
      this.openHotspot.openModal$.subscribe((data: Hotspot) => {
        console.log('📂 Modal abierto con datos:', data);
        this.modalData = { ...this.getDefaultModalData(), ...data };
        this.visible = true;
        this.resetForm();
        this.validateForm();
      })
    );

    // Suscribirse al cierre del modal
    this.closeSubscription = this.openHotspot.closeModal$?.subscribe(() => {
      this.closeBar();
    });
  }

  ngOnDestroy() {
    console.log('🧹 OpenHotspotComponent → Limpiando recursos...');
    this.subscription?.unsubscribe();
    this.closeSubscription?.unsubscribe();
    this.cleanupImagePreviews();
  }

  // ============================================
  // INICIALIZACIÓN Y CONFIGURACIÓN
  // ============================================

  private createHotspot(): void {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);
    console.log('🎯 Hotspot Three.js creado:', this.mesh);
  }

  private getDefaultModalData(): Partial<Hotspot> {
    return {
      criticidad: 'Media',
      red: 'Eléctrica',
      tipoRed: 'Distribución',
      tipoVia: 'Calle',
      numero: 'S/N',
      condicion: 'Inactivo',
      viewCapturePath: 0
    };
  }

  private loadPanoramaCoordinates(): void {
    if (this.currentPanoramaId !== null) {
      this.subscription.add(
        this.apiService.getPanoramaById(this.currentPanoramaId).subscribe({
          next: (response) => {
            this.latitude = response.data.latitude;
            this.longitude = response.data.longitude;
            console.log('🌍 Coordenadas cargadas:', { latitude: this.latitude, longitude: this.longitude });
          },
          error: (error) => {
            console.error('❌ Error cargando coordenadas del panorama:', error);
          }
        })
      );
    }
  }

  private resetForm(): void {
    this.selectedFiles = [];
    this.uploadedImagePreviews = [];
    this.uploadProgress = [];
    this.validationErrors = [];
    this.showValidation = false;
    this.uploading = false;
    this.saving = false;
  }

  // ============================================
  // GESTIÓN DE ARCHIVOS MEJORADA
  // ============================================

  onFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.files) return;

    const filesArray = Array.from(target.files);
    console.log(`📁 Archivos seleccionados: ${filesArray.length}`);

    // Validar archivos
    const validFiles = this.validateFiles(filesArray);
    if (validFiles.length === 0) return;

    // Verificar límite de archivos
    const totalFiles = this.selectedFiles.length + validFiles.length;
    if (totalFiles > this.maxFiles) {
      this.showError(`Máximo ${this.maxFiles} archivos permitidos. Tienes ${this.selectedFiles.length} archivos ya seleccionados.`);
      return;
    }

    // Agregar archivos válidos
    this.selectedFiles.push(...validFiles);
    this.generateImagePreviews();

    // Inicializar progreso de subida
    this.initializeUploadProgress(validFiles);

    // Subir archivos secuencialmente
    this.uploadFilesSequentially(validFiles);
  }

  private validateFiles(files: File[]): File[] {
    const validFiles: File[] = [];

    for (const file of files) {
      // Validar tipo
      if (!this.allowedTypes.includes(file.type)) {
        this.showError(`Tipo de archivo no válido: ${file.name}. Tipos permitidos: Imágenes, PDF, Word.`);
        continue;
      }

      // Validar tamaño
      if (file.size > this.maxFileSize) {
        this.showError(`Archivo demasiado grande: ${file.name}. Máximo ${this.formatFileSize(this.maxFileSize)}.`);
        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  }

  private initializeUploadProgress(files: File[]): void {
    files.forEach((file, index) => {
      this.uploadProgress.push({
        fileIndex: this.selectedFiles.length - files.length + index,
        fileName: file.name,
        progress: 0,
        status: 'pending'
      });
    });
  }

  private async uploadFilesSequentially(files: File[]): Promise<void> {
    console.log(`🔄 Iniciando subida secuencial de ${files.length} archivos`);
    this.uploading = true;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = this.selectedFiles.length - files.length + i;
      const fileNumber = (fileIndex + 1) as 1 | 2 | 3;

      console.log(`📤 Subiendo archivo ${fileNumber}/${this.selectedFiles.length}: ${file.name}`);

      try {
        // Actualizar estado a "subiendo"
        this.updateUploadProgress(fileIndex, 50, 'uploading');

        const fileUrl = await this.uploadFileAutomatically(file, fileNumber);

        // Actualizar estado a "éxito"
        this.updateUploadProgress(fileIndex, 100, 'success', fileUrl);

        console.log(`✅ Archivo ${fileNumber} subido exitosamente: ${fileUrl}`);

        // Pausa entre subidas
        await this.delay(500);

      } catch (error) {
        console.error(`❌ Error en archivo ${fileNumber}:`, error);
        this.updateUploadProgress(fileIndex, 0, 'error', undefined, (error as Error).message);
      }
    }

    this.uploading = false;
    this.validateForm();
    console.log('🏁 Subida secuencial completada');
  }

  private async uploadFileAutomatically(file: File, fileNumber: 1 | 2 | 3): Promise<string> {
    console.log(`🚀 Subiendo archivo ${fileNumber}: ${file.name}`);

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('tags', 'hotspot-attachment');
      formData.append('createdBy', 'hotspot-system');

      const response = await this.apiService.uploadFile(formData).toPromise() as any;

      if (!response || !response.s3Bucket || !response.s3Key) {
        throw new Error('Respuesta inválida del servidor');
      }

      const fileUrl = this.generateS3Url(response.s3Bucket, response.s3Key);

      // Asignar URL al campo correspondiente
      this.assignFileUrl(fileNumber, fileUrl);

      return fileUrl;

    } catch (error) {
      const errorMessage = (error as any)?.message || 'Error desconocido al subir archivo';
      console.error(`❌ Error subiendo ${file.name}:`, error);
      throw new Error(errorMessage);
    }
  }

  private assignFileUrl(fileNumber: 1 | 2 | 3, url: string): void {
    switch (fileNumber) {
      case 1:
        this.modalData.filePath1 = url;
        break;
      case 2:
        this.modalData.filePath2 = url;
        break;
      case 3:
        this.modalData.filePath3 = url;
        break;
    }
    console.log(`✅ URL asignada a filePath${fileNumber}: ${url}`);
  }

  private updateUploadProgress(fileIndex: number, progress: number, status: UploadProgress['status'], url?: string, error?: string): void {
    const progressItem = this.uploadProgress.find(p => p.fileIndex === fileIndex);
    if (progressItem) {
      progressItem.progress = progress;
      progressItem.status = status;
      if (url) progressItem.url = url;
      if (error) progressItem.error = error;
    }
  }

  // ============================================
  // GESTIÓN DE ARCHIVOS - UTILIDADES
  // ============================================

  removeFile(index: number): void {
    if (index >= 0 && index < this.selectedFiles.length) {
      const fileName = this.selectedFiles[index].name;
      console.log(`🗑️ Eliminando archivo ${index + 1}: ${fileName}`);

      // Eliminar archivo y progreso
      this.selectedFiles.splice(index, 1);
      this.uploadProgress.splice(index, 1);

      // Limpiar URL correspondiente
      this.clearFileUrl(index + 1 as 1 | 2 | 3);

      // Regenerar previews
      this.generateImagePreviews();
      this.validateForm();
    }
  }

  private clearFileUrl(fileNumber: 1 | 2 | 3): void {
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
    console.log(`🗑️ FilePath${fileNumber} limpiado`);
  }



  removeExistingFile(fileNumber: 1 | 2 | 3): void {
    this.clearFileUrl(fileNumber);
    this.validateForm();
    console.log(`🗑️ Archivo existente ${fileNumber} eliminado`);
  }

  public generateImagePreviews(): void {
    this.cleanupImagePreviews();
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

  private cleanupImagePreviews(): void {
    this.uploadedImagePreviews.forEach(preview => {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
  }

  // ============================================
  // VALIDACIÓN DEL FORMULARIO
  // ============================================

  validateForm(): boolean {
    this.validationErrors = [];

    // Validar campos requeridos
    if (!this.modalData.codigoPosteAntiguo?.trim()) {
      this.validationErrors.push('El código del poste antiguo es obligatorio');
    }

    if (!this.modalData.tipoPoste) {
      this.validationErrors.push('Debe seleccionar el tipo de poste');
    }

    // Validar archivos
    const hasFiles = this.selectedFiles.length > 0 || this.hasExistingFiles();
    if (!hasFiles) {
      this.validationErrors.push('Debe adjuntar al menos un archivo');
    }

    // Validar archivos en proceso de subida
    const hasUploadingFiles = this.uploadProgress.some(p => p.status === 'uploading');
    if (hasUploadingFiles) {
      this.validationErrors.push('Espere a que terminen de subir todos los archivos');
    }

    const isValid = this.validationErrors.length === 0;
    this.showValidation = !isValid;

    console.log('📋 Validación del formulario:', {
      isValid,
      errors: this.validationErrors,
      hasRequiredFields: !!this.modalData.codigoPosteAntiguo?.trim() && !!this.modalData.tipoPoste,
      hasFiles,
      hasUploadingFiles
    });

    return isValid;
  }

  isFormValid(): boolean {
    return this.validateForm();
  }

  // ============================================
  // GUARDADO DE DATOS
  // ============================================

  saveHotspot(): void {
    console.log('💾 Iniciando guardado del hotspot...');

    if (!this.validateForm()) {
      console.error('❌ Formulario no válido');
      this.showValidation = true;
      return;
    }

    if (this.uploading) {
      this.showError('Por favor espere a que terminen de subir todos los archivos');
      return;
    }

    this.saving = true;
    this.savePosteData();
  }

  private savePosteData(): void {
    const posteToSave = {
      id: this.modalData.id || 0,
      item: this.modalData.item?.toString() || '0',
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
      latitudS: this.latitude?.toString() || '',
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
      filePath2: this.modalData.filePath2 || '',
      filePath3: this.modalData.filePath3 || '',
    };

    console.log('📤 Enviando datos del poste:', posteToSave);

    this.apiService.postPoste(posteToSave).subscribe({
      next: (response) => {
        console.log('✅ Poste guardado correctamente:', response);
        this.handleSaveSuccess();
      },
      error: (error) => {
        console.error('❌ Error al guardar poste:', error);
        this.handleSaveError(error);
      }
    });
  }

  private handleSaveSuccess(): void {
    this.saving = false;
    this.showSuccess('Poste guardado correctamente');

    // Actualizar el panorama para indicar que tiene hotspots
    if (this.currentPanoramaId) {
      this.updatePanoramaHotspotStatus();
    }

    // Actualizar el color del hotspot en Three.js
    if (this.vrThreeService.selectedHotspot) {
      this.vrThreeService.paintHotspot(this.vrThreeService.selectedHotspot, this.modalData.tipoPoste);
    }

    // Cerrar el modal después de un breve delay
    setTimeout(() => {
      this.closeBar();
    }, 1500);
  }

  private handleSaveError(error: any): void {
    this.saving = false;

    let errorMessage = 'Error al guardar el poste';

    if (error.status === 400 && error.error?.errors) {
      const validationErrors = Object.entries(error.error.errors)
        .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
        .join('\n');
      errorMessage = `Errores de validación:\n${validationErrors}`;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.showError(errorMessage);
  }

  private updatePanoramaHotspotStatus(): void {
    if (!this.currentPanoramaId) return;

    const updatePayload = {
      id: this.currentPanoramaId,
      hasHotspots: 1
    };

    this.apiService.updatePanoramaHasHotspot(updatePayload).subscribe({
      next: () => {
        console.log('✅ Estado de hotspots del panorama actualizado');
      },
      error: (error) => {
        console.error('❌ Error actualizando estado del panorama:', error);
      }
    });
  }

  // ============================================
  // UTILIDADES Y HELPERS
  // ============================================

  closeBar(): void {
    console.log('🚪 Cerrando panel lateral...');

    if (this.vrThreeService.selectedHotspot) {
      this.vrThreeService.paintHotspot(this.vrThreeService.selectedHotspot, this.modalData.tipoPoste);
    }

    this.visible = false;
    this.openHotspot.notifyModalClosed?.();
    this.resetForm();
  }

  // Métodos públicos para el template
  getFilePathByIndex(index: number): string {
    switch (index) {
      case 0: return this.modalData.filePath1 || '';
      case 1: return this.modalData.filePath2 || '';
      case 2: return this.modalData.filePath3 || '';
      default: return '';
    }
  }

  getUploadProgress(index: number): UploadProgress | undefined {
    return this.uploadProgress.find(p => p.fileIndex === index);
  }

  hasExistingFiles(): boolean {
    return !!(this.modalData.filePath1 || this.modalData.filePath2 || this.modalData.filePath3);
  }

  viewFile(filePath: string): void {
    if (filePath && filePath.startsWith('http')) {
      console.log('👁️ Abriendo archivo:', filePath);
      window.open(filePath, '_blank');
    }
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('📋 URL copiada al portapapeles:', text);
        this.showSuccess('URL copiada al portapapeles');
      }).catch(error => {
        console.error('❌ Error al copiar:', error);
        this.copyTextFallback(text);
      });
    } else {
      this.copyTextFallback(text);
    }
  }

  private copyTextFallback(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.showSuccess('URL copiada al portapapeles');
    } catch (err) {
      console.error('❌ Error en fallback copy:', err);
      this.showError('No se pudo copiar la URL');
    }
    document.body.removeChild(textArea);
  }

  updateColor(newColor: number): void {
    if (this.mesh && this.mesh.material instanceof THREE.MeshBasicMaterial) {
      this.mesh.material.color.set(newColor);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  formatCoordinate(coord: number): string {
    return coord ? coord.toFixed(6) : 'N/A';
  }

  // ============================================
  // MÉTODOS PRIVADOS DE UTILIDAD
  // ============================================



  private generateS3Url(bucket: string, key: string): string {
    const url = `https://${bucket}.s3.amazonaws.com/${key}`;
    console.log('🔗 URL S3 generada:', { bucket, key, url });
    return url;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private showSuccess(message: string): void {
    // Implementar notificación de éxito
    console.log('✅ Éxito:', message);
    // Aquí podrías integrar con un servicio de notificaciones
  }

  private showError(message: string): void {
    // Implementar notificación de error
    console.error('❌ Error:', message);
    // Aquí podrías integrar con un servicio de notificaciones
    alert(message); // Temporal - reemplazar con notificación más elegante
  }

  // ============================================
  // MÉTODOS LEGACY (mantener compatibilidad)
  // ============================================

  onImageSelect(event: Event): void {
    // Redirigir al nuevo método
    this.onFileSelect(event);
  }

  getHotspotComplete(): void {
    // Método legacy - mantener para compatibilidad
    console.log('getHotspotComplete() called');
  }

  changeState(): void {
    // Método legacy - mantener para compatibilidad
    console.log('changeState() called');
  }
}
