import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import * as piexif from 'piexifjs';
import { AdminEndpointService } from "../../Services/endpoint/admin-endpoint.service";

export interface ImageMetadata {
  make?: string;
  model?: string;
  datetime?: string;
  latitude?: number;
  longitude?: number;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  orientation?: number;
  fileSize?: number;
  fileName?: string;
  fileType?: string;
}

export interface ProcessedImage {
  id: string;
  file: File;
  metadata: ImageMetadata;
  preview: string;
  direccion?: string;
  processingState: ProcessingState;
  // Nuevas propiedades para upload individual
  isUploading?: boolean;
  uploadedUrl?: string;
  uploadError?: string;
  uploadedFileInfo?: UploadedFileInfo;
}

export interface ProcessingState {
  isProcessing: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface GlobalProcessingState {
  isProcessingAny: boolean;
  processedCount: number;
  totalCount: number;
}

// Nueva interfaz para la respuesta del backend
export interface UploadedFileInfo {
  id: string;
  fileName: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  tags?: string;
  s3Bucket: string;
  s3Key: string;
}

@Component({
  selector: 'app-image-uploader',
  templateUrl: './image-uploader.component.html',
  styleUrls: ['./image-uploader.component.scss']
})
export class ImageUploaderComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  // Cambio principal: array de imágenes procesadas
  processedImages: ProcessedImage[] = [];
  selectedFiles: File[] = [];

  // Estado global de procesamiento
  globalProcessingState: GlobalProcessingState = {
    isProcessingAny: false,
    processedCount: 0,
    totalCount: 0
  };

  // Nueva propiedad para controlar upload masivo
  isUploadingAll = false;

  readonly maxFileSize = 10 * 1024 * 1024;
  readonly allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  readonly maxImages = 20; // Límite de imágenes

  constructor(
    private http: HttpClient,
    private endpoint: AdminEndpointService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupAllPreviews();
  }

  // Método principal para manejar múltiples archivos
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) {
      return;
    }

    // Convertir FileList a Array
    const fileArray = Array.from(files);

    // Validar límite de imágenes
    if (this.processedImages.length + fileArray.length > this.maxImages) {
      alert(`No puedes subir más de ${this.maxImages} imágenes. Actualmente tienes ${this.processedImages.length} imágenes.`);
      return;
    }

    // Filtrar archivos válidos
    const validFiles = fileArray.filter(file => this.validateFile(file));
    if (validFiles.length === 0) {
      return;
    }

    // Actualizar estado global
    this.globalProcessingState = {
      isProcessingAny: true,
      processedCount: 0,
      totalCount: validFiles.length
    };

    // Procesar cada archivo
    validFiles.forEach(file => this.processNewImage(file));
  }

  private validateFile(file: File): boolean {
    if (!this.allowedTypes.includes(file.type)) {
      console.error(`Archivo ${file.name}: Tipo no válido. Solo se permiten imágenes JPEG o PNG.`);
      return false;
    }

    if (file.size > this.maxFileSize) {
      console.error(`Archivo ${file.name}: Demasiado grande. Máximo 10MB.`);
      return false;
    }

    return true;
  }

  private async processNewImage(file: File): Promise<void> {
    const imageId = this.generateImageId();

    // Crear objeto de imagen inicial
    const processedImage: ProcessedImage = {
      id: imageId,
      file: file,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      },
      preview: '',
      processingState: {
        isProcessing: true,
        hasError: false
      },
      // Inicializar nuevas propiedades
      isUploading: false,
      uploadedUrl: undefined,
      uploadError: undefined,
      uploadedFileInfo: undefined
    };

    // Agregar a la lista
    this.processedImages.push(processedImage);

    try {
      // Procesar imagen
      processedImage.preview = await this.createImagePreview(file);
      const metadata = await this.extractMetadata(file);
      processedImage.metadata = {
        ...metadata,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type
      };

      processedImage.processingState = {
        isProcessing: false,
        hasError: false
      };

      // Si tiene coordenadas GPS, obtener dirección
      if (metadata.latitude && metadata.longitude) {
        this.getAddressFromCoords(metadata.latitude, metadata.longitude, imageId);
      }
    } catch (error) {
      console.error(`Error procesando imagen ${file.name}:`, error);
      processedImage.processingState = {
        isProcessing: false,
        hasError: true,
        errorMessage: 'Error al procesar la imagen'
      };
    }

    // Actualizar estado global
    this.updateGlobalProcessingState();
  }

  private generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateGlobalProcessingState(): void {
    const processingImages = this.processedImages.filter(img => img.processingState.isProcessing);
    const processedCount = this.processedImages.length - processingImages.length;

    this.globalProcessingState = {
      isProcessingAny: processingImages.length > 0,
      processedCount: processedCount,
      totalCount: this.processedImages.length
    };
  }

  getAddressFromCoords(lat: number, lng: number, imageId: string): void {
    this.endpoint.getAddressFromCoords(lat, lng).subscribe({
      next: (response) => {
        const image = this.processedImages.find(img => img.id === imageId);
        if (image) {
          image.direccion = response.address;
          console.log(`Dirección para ${image.metadata.fileName}:`, response.address);
        }
      },
      error: (err: any) => {
        console.error('Error al obtener dirección:', err);
      }
    });
  }

  private createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) resolve(e.target.result as string);
        else reject('Error creando preview');
      };
      reader.onerror = () => reject('Error leyendo archivo');
      reader.readAsDataURL(file);
    });
  }

  private extractMetadata(file: File): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const dataUrl = e.target?.result as string;
          const exif = piexif.load(dataUrl);
          const zeroth = exif['0th'];
          const exifData = exif['Exif'];
          const gps = exif['GPS'];

          const getRational = (value: [number, number]) =>
            value && value[1] !== 0 ? (value[0] / value[1]).toFixed(1) : '0';

          const metadata: ImageMetadata = {};

          if (zeroth && exifData) {
            metadata.make = zeroth[piexif.ImageIFD.Make];
            metadata.model = zeroth[piexif.ImageIFD.Model];
            metadata.datetime = zeroth[piexif.ImageIFD.DateTime];
            metadata.iso = exifData[piexif.ExifIFD.ISOSpeedRatings];
            metadata.aperture = exifData[piexif.ExifIFD.FNumber]
              ? `f/${getRational(exifData[piexif.ExifIFD.FNumber])}`
              : undefined;
            metadata.shutterSpeed = exifData[piexif.ExifIFD.ExposureTime]
              ? this.formatShutterSpeed(exifData[piexif.ExifIFD.ExposureTime])
              : undefined;
            metadata.focalLength = exifData[piexif.ExifIFD.FocalLength]
              ? `${getRational(exifData[piexif.ExifIFD.FocalLength])}mm`
              : undefined;
          }

          // GPS
          if (gps) {
            const latData = gps[piexif.GPSIFD.GPSLatitude];
            const latRef = gps[piexif.GPSIFD.GPSLatitudeRef];
            const lngData = gps[piexif.GPSIFD.GPSLongitude];
            const lngRef = gps[piexif.GPSIFD.GPSLongitudeRef];

            if (latData && latRef && lngData && lngRef) {
              metadata.latitude = this.convertGPSToDecimal(latData, latRef);
              metadata.longitude = this.convertGPSToDecimal(lngData, lngRef);
            }
          }

          resolve(metadata);
        } catch (error) {
          console.warn('Error leyendo EXIF:', error);
          resolve({});
        }
      };
      reader.onerror = () => reject('Error leyendo archivo');
      reader.readAsDataURL(file);
    });
  }

  private convertGPSToDecimal(coord: [number, number][], ref: string): number {
    const degrees = coord[0][0] / coord[0][1];
    const minutes = coord[1][0] / coord[1][1];
    const seconds = coord[2][0] / coord[2][1];
    const decimal = degrees + minutes / 60 + seconds / 3600;
    return ref === 'S' || ref === 'W' ? -decimal : decimal;
  }

  private formatShutterSpeed(exposureTime: [number, number]): string {
    if (!exposureTime || exposureTime[1] === 0) return '';
    const [num, den] = exposureTime;
    return den > num ? `1/${Math.round(den / num)}s` : `${(num / den).toFixed(2)}s`;
  }

  private cleanupAllPreviews(): void {
    this.processedImages.forEach(image => {
      if (image.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(image.preview);
      }
    });
  }

  // Métodos para manejar imágenes individuales
  onRemoveImage(imageId: string): void {
    const index = this.processedImages.findIndex(img => img.id === imageId);
    if (index > -1) {
      const image = this.processedImages[index];
      if (image.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(image.preview);
      }
      this.processedImages.splice(index, 1);
      this.updateGlobalProcessingState();
    }
  }

  trackByImageId(index: number, image: any): string {
    return image.fileName ?? index.toString();
  }

  onRemoveAllImages(): void {
    this.cleanupAllPreviews();
    this.processedImages = [];
    this.globalProcessingState = {
      isProcessingAny: false,
      processedCount: 0,
      totalCount: 0
    };
  }

  getFileSize(fileSize: number): string {
    const sizeInMB = fileSize / (1024 * 1024);
    return sizeInMB < 1
      ? `${Math.round(fileSize / 1024)} KB`
      : `${sizeInMB.toFixed(2)} MB`;
  }

  hasLocation(image: ProcessedImage): boolean {
    return !!(image.metadata?.latitude && image.metadata?.longitude);
  }

  getLocationString(image: ProcessedImage): string {
    return this.hasLocation(image)
      ? `${image.metadata.latitude!.toFixed(6)}, ${image.metadata.longitude!.toFixed(6)}`
      : '';
  }

  onOpenMaps(image: ProcessedImage): void {
    if (this.hasLocation(image)) {
      const url = `https://www.google.com/maps?q=${image.metadata.latitude},${image.metadata.longitude}`;
      window.open(url, '_blank');
    }
  }

  // Métodos de utilidad
  getTotalFileSize(): string {
    const totalSize = this.processedImages.reduce((sum, img) => sum + img.file.size, 0);
    return this.getFileSize(totalSize);
  }

  getImagesWithLocation(): ProcessedImage[] {
    return this.processedImages.filter(img => this.hasLocation(img));
  }

  getImagesWithErrors(): ProcessedImage[] {
    return this.processedImages.filter(img => img.processingState.hasError);
  }

  // NUEVOS MÉTODOS PARA UPLOAD INDIVIDUAL

  // Método para subir un archivo individual
  async uploadSingleFile(image: ProcessedImage): Promise<void> {
    if (image.isUploading || image.uploadedUrl) {
      return;
    }

    image.isUploading = true;
    image.uploadError = undefined;

    try {
      const formData = new FormData();
      formData.append('file', image.file, image.file.name);
      formData.append('tags', 'string');
      formData.append('createdBy', 'string');

      const response = await this.endpoint.uploadFileConvert(formData).toPromise() as unknown as UploadedFileInfo;

      if (response) {
        image.uploadedFileInfo = response;
        image.uploadedUrl = this.generateS3Url(response.s3Bucket, response.s3Key);
        console.log('Archivo subido exitosamente:', response);
      }
    } catch (error) {
      console.error('Error al subir archivo:', error);
      image.uploadError = 'Error al subir el archivo. Intenta nuevamente.';
    } finally {
      image.isUploading = false;
    }
  }

  // Método para generar la URL de S3
  generateS3Url(bucket: string, key: string): string {
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  // Método para subir todas las imágenes
  async uploadAllFiles(): Promise<void> {
    if (this.isUploadingAll) {
      return;
    }

    this.isUploadingAll = true;

    try {
      const imagesToUpload = this.processedImages.filter(img =>
        !img.uploadedUrl && !img.isUploading && !img.processingState.isProcessing
      );

      const uploadPromises = imagesToUpload.map(image => this.uploadSingleFile(image));
      await Promise.all(uploadPromises);

      console.log('Todas las imágenes han sido subidas');
    } catch (error) {
      console.error('Error al subir todas las imágenes:', error);
    } finally {
      this.isUploadingAll = false;
    }
  }

  // Método para reintentar subida
  async retryUpload(image: ProcessedImage): Promise<void> {
    image.uploadError = undefined;
    await this.uploadSingleFile(image);
  }

  // Método para copiar URL al portapapeles
  async copyToClipboard(url: string, inputElement: HTMLInputElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      inputElement.select();
      inputElement.setSelectionRange(0, 99999);
      console.log('URL copiada al portapapeles');
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
      inputElement.select();
      document.execCommand('copy');
    }
  }

  // Método para abrir imagen en nueva pestaña
  openImageInNewTab(url: string): void {
    window.open(url, '_blank');
  }

  // Método para obtener imágenes con URL
  getImagesWithUrls(): ProcessedImage[] {
    return this.processedImages.filter(img => img.uploadedUrl);
  }

  // Método para formatear fecha
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Método original mantenido por compatibilidad
  public uploadFiles(): void {
    if (this.selectedFiles.length === 0) return;

    const formData = new FormData();
    formData.append('file', this.selectedFiles[0], this.selectedFiles[0].name);
    formData.append('tags', 'string');
    formData.append('createdBy', 'string');

    console.log('Archivo subido correctamente', this.selectedFiles[0].type);

    this.endpoint.uploadFileConvert(formData).subscribe({
      next: (response) => {
        console.log('Archivo subido correctamente', response);
        console.log('Archivo subido correctamente', this.selectedFiles[0].type);
      },
      error: (err) => {
        console.error('Error al subir archivo:', err);
        console.log('Archivo subido correctamente', this.selectedFiles[0].type);
      }
    });
  }
}
