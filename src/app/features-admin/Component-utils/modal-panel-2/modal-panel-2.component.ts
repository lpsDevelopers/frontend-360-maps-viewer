import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Subject, Subscription} from "rxjs";
import {ModalService} from "../../../features/Services/viewer-360/modal/modal.service";
import * as Papa from "papaparse";
import * as piexif from "piexifjs";
import {GlobalProcessingState, ImageMetadata, ProcessedImage} from "../image-uploader/image-uploader.component";
import {EndpointService} from "../../../features/Services/endpoint/endpoint.service";
import {AdminEndpointService} from "../../Services/endpoint/admin-endpoint.service";

@Component({
  selector: 'app-modal-panel-2',
  templateUrl: './modal-panel-2.component.html',
  styleUrls: ['./modal-panel-2.component.scss']
})
export class ModalPanel2Component implements  OnInit, OnDestroy {
  @Input() headers: string[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() filtersApplied = new EventEmitter<any[]>();
  showSuccessModal = false;
  filters: any[] = [];
  availableFields: string[] = [];
  private headerSubscription: Subscription = new Subscription();
  debug: boolean = true;


  locations: any[] = [];
  loadingLocations = false;


  availableFilterTypes: any[] = [
    {
      id: '1',
      name: 'Texto',
      type: 'text',
      config: {
        placeholder: 'Ingrese texto',
        validation: { required: false }
      }
    },
    {
      id: '2',
      name: 'Número',
      type: 'number',
      config: {
        min: 0,
        max: 100,
        step: 1,
        validation: { required: false }
      }
    },
    {
      id: '3',
      name: 'Rango',
      type: 'range',
      config: {
        min: 0,
        max: 100,
        step: 1
      }
    },
    {
      id: '4',
      name: 'Selección única',
      type: 'select',
      config: {
        options: [
          { label: 'Opción 1', value: '1' },
          { label: 'Opción 2', value: '2' }
        ]
      }
    },
    {
      id: '5',
      name: 'Selección múltiple',
      type: 'multiSelect',
      config: {
        options: [
          { label: 'Opción 1', value: '1' },
          { label: 'Opción 2', value: '2' }
        ]
      }
    },
    {
      id: '6',
      name: 'Fecha',
      type: 'date',
      config: {
        format: 'yyyy-MM-dd'
      }
    }
  ];

  availableStates: string[] = ['0', '1', '2', '3'];
  showErrorMessage: boolean = false;
  errorMessage: string = '';

  imageFiles: File[] = [];
  imagePreviews: string[] = [];

  showSaveConfigModal: boolean = false;
  configurationName: string = '';

  savedConfigurations: any[] = ['0d', '1', '2', '3'];

  currentLayout: 'Hotspots' | 'Panoramas' | 'Locations' | 'Companies'  = 'Hotspots';

  columnHeaders: string[] = [];

  addRecords: any[] = [
    {
      id: '1',
      name: 'Panoramas',
      headers: [
        'locationId' ,'filename', 'address', 'thumbnail', 'latitude', 'longitude'
      ],
    },
  ];

  selectedConfigId: string | null = null;

  // Otro componente
  private destroy$ = new Subject<void>();

  // Cambio principal: array de imágenes procesadas
  processedImages: ProcessedImage[] = [];

  // Estado global de procesamiento
  globalProcessingState: GlobalProcessingState = {
    isProcessingAny: false,
    processedCount: 0,
    totalCount: 0
  };

  readonly maxFileSize = 10 * 1024 * 1024;
  readonly allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  readonly maxImages = 20; // Límite de imágenes
  constructor(
    private endpointService: AdminEndpointService,
    private modalService: ModalService
  ) {
    this.addFilter();
  }
  handleLocationError() {
    // Datos de respaldo en caso de error
    this.locations = [
      { id: 1, name: 'Ubicación no disponible', description: 'Error de conexión' }
    ];
  }

  getLocationNameById(locationId: number): string {
    if (!locationId) return 'Seleccionar ubicación';
    const location = this.locations.find(loc => loc.id === locationId);
    return location ? location.name : `Ubicación ${locationId}`;
  }

  onLocationChange(index: number, event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedLocationId = parseInt(target.value);

    if (selectedLocationId) {
      this.filters[index]['locationId'] = selectedLocationId;
      console.log(`Ubicación seleccionada: ${selectedLocationId} en fila ${index}`);
    } else {
      this.filters[index]['locationId'] = null;
    }
  }

  isLocationField(header: string): boolean {
    return header === 'locationId';
  }



  loadLocations() {
    this.loadingLocations = true;

    this.endpointService.allLocations().subscribe({
      next: (response) => {
        if (response.isSucces && response.data) {
          this.locations = response.data;
          console.log('Ubicaciones cargadas:', this.locations);
        } else {
          console.error('Error en la respuesta:', response.message);
          this.handleLocationError();
        }
        this.loadingLocations = false;
      },
      error: (error) => {
        console.error('Error cargando ubicaciones:', error);
        this.handleLocationError();
        this.loadingLocations = false;
      }
    });
  }

  readCSV(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      const csv = reader.result as string;

      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rawRows = result.data as any[];
          const csvHeaders = Object.keys(rawRows[0]);

          // Mapeo flexible
          const headerMap: Record<string, string> = {};
          csvHeaders.forEach(csvHeader => {
            const match = this.findClosestHeader(csvHeader, this.columnHeaders);
            if (match) {
              headerMap[csvHeader] = match;
            }
          });

          const parsedRows = rawRows.map(row => {
            const mappedRow: any = {};
            this.columnHeaders.forEach(header => {
              // Busca el header correspondiente del CSV
              const csvKey = Object.keys(headerMap).find(k => headerMap[k] === header);
              mappedRow[header] = csvKey ? row[csvKey] : '';
            });
            return mappedRow;
          });

          this.filters = parsedRows;
          console.log('Filtros autocompletados desde CSV:', this.filters);
        },
        error: (err: any) => {
          console.error('Error al leer el CSV:', err);
        }
      });
    };

    reader.readAsText(file);
  }

  onImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.handleImageFiles(Array.from(input.files));
    }
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleImageFiles(Array.from(files));
    }
  }



  handleImageFiles(files: File[]): void {
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    for (const file of files) {
      if (acceptedTypes.includes(file.type)) {
        this.imageFiles.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result); // Base64 para previsualización
        };
        reader.readAsDataURL(file);
      } else {
        console.warn('Tipo de archivo no válido:', file.name);
      }
    }
  }

  readExcel(file: File): void {
  }

  private findClosestHeader(csvHeader: string, validHeaders: string[]): string | null {
    const normalizedCsv = this.normalizeHeader(csvHeader);

    let bestMatch = null;
    let bestScore = 0;

    for (const valid of validHeaders) {
      const normalizedValid = this.normalizeHeader(valid);
      const matchLength = this.longestCommonSubstring(normalizedCsv, normalizedValid).length;

      if (matchLength > bestScore) {
        bestScore = matchLength;
        bestMatch = valid;
      }
    }

    return bestScore >= 3 ? bestMatch : null;
  }

  private longestCommonSubstring(a: string, b: string): string {
    const matrix = Array(a.length).fill(null).map(() => Array(b.length).fill(0));
    let longest = 0;
    let endIndex = 0;

    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        if (a[i] === b[j]) {
          matrix[i][j] = (i > 0 && j > 0) ? matrix[i - 1][j - 1] + 1 : 1;
          if (matrix[i][j] > longest) {
            longest = matrix[i][j];
            endIndex = i;
          }
        }
      }
    }

    return a.slice(endIndex - longest + 1, endIndex + 1);
  }
  private normalizeHeader(header: string): string {
    return header
      .normalize("NFD")                        // Elimina acentos
      .replace(/[\u0300-\u036f]/g, "")        // Elimina diacríticos
      .replace(/[^a-zA-Z0-9]/g, "")           // Elimina símbolos
      .toLowerCase();
  }
  ngOnInit() {
    this.loadLocations();
    const postes = this.addRecords.find(r => r.id === '1');
    if (postes) {
      this.columnHeaders = postes.headers;
      this.filters = []; // No agregues ninguna fila aún
    }
    this.modalServiceSubscription.add(
    );
    this.availableFields = this.headers;
  }

  private modalServiceSubscription: Subscription = new Subscription();

  ngOnDestroy() {
    // Limpiar todas las suscripciones
    this.headerSubscription.unsubscribe();
    this.modalServiceSubscription.unsubscribe();
  }

  createEmptyFilter(headers: string[]) {
    const row: any = {};
    headers.forEach(h => {
      switch (h) {
        case 'locationId':
          row[h] = null; // Sin seleccionar por defecto
          break;
        case 'latitude':
        case 'longitude':
          row[h] = 0;
          break;
        case 'hasHotspots':
          row[h] = 0;
          break;
        default:
          row[h] = '';
      }
    });
    return row;
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      console.log('Archivo seleccionado:', file.name, file.type);

      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        this.readCSV(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        this.readExcel(file);
      } else {
        this.errorMessage = 'Formato de archivo no soportado. Por favor, use CSV o Excel.';
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        this.readCSV(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        this.readExcel(file);
      } else {
        this.errorMessage = 'Formato de archivo no soportado. Por favor, use CSV o Excel.';
      }
    }
  }

  loadRecord(recordId: string) {
    const selected = this.addRecords.find(r => r.id === recordId);

    if (!selected) {
      this.columnHeaders = [];
      this.filters = [];
      return;
    }
    this.columnHeaders = selected.headers || [];

    this.filters = [{ field: '', filterType: '', value: '', valueEnd: '', states: [] }];
  }

  getInputType(filter: any): string {
    return filter.type || 'text';
  }

  loadConfiguration(configId: string) {
    if (configId === 'default') {
      this.selectedConfigId = null;
      return;
    }

    const config = this.savedConfigurations.find(c => c.id === configId);
    if (config) {
      this.filters = JSON.parse(JSON.stringify(config.filters));
      this.selectedConfigId = configId;
      this.validateFilters();
    }
  }

  saveConfiguration() {
    if (!this.configurationName.trim()) {
      this.errorMessage = 'El nombre es requerido';
      return;
    }

    if (!this.validateFilters()) {
      this.errorMessage = 'Por favor complete todos los campos correctamente';
      return;
    }

    try {
      const newConfig: any = {
        id: Date.now().toString(),
        name: this.configurationName.trim(),
        filters: JSON.parse(JSON.stringify(this.filters)), // Deep clone
        createdAt: new Date()
      };

      const existingConfig = this.savedConfigurations.find(
        config => config.name.toLowerCase() === newConfig.name.toLowerCase()
      );

      if (existingConfig) {
        this.errorMessage = 'Ya existe una configuración con este nombre';
        return;
      }
      this.selectedConfigId = newConfig.id;
      this.showSaveConfigModal = false;
      this.configurationName = '';
      this.errorMessage = '';

      console.log('Configuración guardada:', newConfig);
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      this.errorMessage = 'Error al guardar la configuración';
    }
  }



  openSaveConfigModal() {
    if (!this.validateFilters()) {
      this.errorMessage = 'Por favor complete todos los campos antes de guardar';
      return;
    }
    this.configurationName = '';
    this.showSaveConfigModal = true;
  }

  deleteConfiguration(configId: string) {
    if (confirm('¿Está seguro de eliminar esta configuración?')) {


      if (this.selectedConfigId === configId) {
        this.selectedConfigId = null;
      }
    }
  }

  addFilter() {
    this.filters.push({
      field: '',
      filterType: '',
      value: '',
      valueEnd: '',
      states: []
    });
  }

  removeFilter(index: number) {
    this.filters.splice(index, 1);
    if (this.filters.length === 0) {
      this.addFilter();
    }
  }

  validateFilters(): boolean {
    const invalidFilters = this.filters.filter(filter => {
      if (!filter.field || !filter.filterType) {
        console.log('Falta campo o tipo de filtro:', filter);
        return true;
      }

      switch (filter.type) {
        case 'text':
          if (!filter.value && filter.config?.validation?.required) {
            console.log('Falta valor en filtro de texto:', filter);
            return true;
          }
          return false;
        case 'range':
          if (!filter.value || !filter.valueEnd) {
            console.log('Falta valor en filtro de tipo rango:', filter);  // Depuración
          }
          return !filter.value || !filter.valueEnd;
        case 'states':
          if (!filter.states?.length) {
            console.log('Falta estado en filtro de tipo estado:', filter);  // Depuración
          }
          return !filter.states?.length;
        default:
          return !filter.value && filter.config?.validation?.required;
      }
    });

    if (invalidFilters.length > 0) {
      console.log('Filtros inválidos:', invalidFilters);
      this.showErrorMessage = true;
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      return false;
    }

    this.showErrorMessage = false;
    return true;
  }

  closeHideOrbitCard() {
    this.closeModal.emit();
    console.log('eliminar modal desde componente hijo');
  }

  applyFilters() {
    console.log('Iniciando aplicación de filtros');

    if (!this.validateFilters()) {
      console.log('Validación falló, no se aplicarán filtros');
      return;
    }

    // Emitir los filtros validados al componente padre
    console.log('Filtros a aplicar:', this.filters);
    this.filtersApplied.emit(this.filters);
    this.closeModal.emit();
  }

  onFieldChange(index: number) {
    this.validateFilters();
  }

  onFilterTypeChange(index: number) {
    const filter = this.filters[index];
    console.log('Tipo de filtro seleccionado:', filter.filterType);

    const filterConfig = this.availableFilterTypes.find(
      ft => ft.name === filter.filterType
    );

    if (filterConfig) {
      console.log('Configuración encontrada:', filterConfig);

      // Resetear valores
      filter.value = '';
      filter.valueEnd = '';
      filter.states = [];

      // Guardar tipo y configuración
      filter.filterType = filterConfig.name;
      filter.type = filterConfig.type;
      filter.config = { ...filterConfig.config };

      console.log('Filtro actualizado:', filter);
    } else {
      console.warn('No se encontró configuración para:', filter.filterType);
    }

    this.validateFilters();
  }

  onFilterValueChange(index: number) {
    this.validateFilters();
  }

  toggleState(filter: any, state: string) {
    if (!filter.states) {
      filter.states = [];
    }

    const index = filter.states.indexOf(state);
    if (index === -1) {
      filter.states.push(state);
    } else {
      filter.states.splice(index, 1);
    }

    this.validateFilters();
  }

  // 2. Agregar el método generateS3Url si no lo tienes
  private generateS3Url(bucket: string, key: string): string {
    // Ajusta según tu configuración de S3
    return `https://${bucket}.s3.amazonaws.com/${key}`;
    // O si usas CloudFront: return `https://tu-cloudfront-domain.com/${key}`;
  }

  // 1. Método para subir imagen usando tu endpoint existente (corregido)
  private async uploadImageToS3(file: File, fileName: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file, fileName);
      formData.append('tags', 'string');
      formData.append('createdBy', 'string');

      const response = await this.endpointService.uploadFileConvert(formData).toPromise() as unknown as any;
      console.log('Respuesta upload:', response);

      // 🎯 USAR LA MISMA LÓGICA QUE EN TU FUNCIÓN QUE FUNCIONA
      if (response && response.s3Bucket && response.s3Key) {
        return this.generateS3Url(response.s3Bucket, response.s3Key);
      }
      throw new Error('Respuesta inválida del servidor');
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw error;
    }
  }
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
    console.log('🔄 Iniciando procesamiento de:', file.name);

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
      }
    };

    // Agregar imagen y nueva fila de filtro
    this.processedImages.push(processedImage);
    this.filters.push(this.createEmptyFilter(this.columnHeaders));

    const currentFilterIndex = this.filters.length - 1;
    const currentFilter = this.filters[currentFilterIndex];

    console.log('📋 Filtro creado en índice:', currentFilterIndex);
    console.log('📋 Headers disponibles:', this.columnHeaders);
    console.log('📋 Filtro inicial:', currentFilter);

    try {
      // 1. Procesar preview y metadata
      processedImage.preview = await this.createImagePreview(file);
      const metadata = await this.extractMetadata(file);

      console.log('📊 Metadata extraída:', metadata);

      processedImage.metadata = {
        ...metadata,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type
      };

      // 2. Llenar datos básicos en los inputs
      if (currentFilter) {
        console.log('✏️ Llenando datos básicos...');
        currentFilter['filename'] = file.name;
        currentFilter['latitude'] = metadata.latitude || '';
        currentFilter['longitude'] = metadata.longitude || '';

        console.log('✏️ Datos básicos llenados:', {
          filename: currentFilter['filename'],
          latitude: currentFilter['latitude'],
          longitude: currentFilter['longitude']
        });
      } else {
        console.error('❌ currentFilter es null o undefined');
      }

      // 3. SUBIR A S3
      console.log(`☁️ Subiendo ${file.name} a S3...`);
      try {
        const thumbnailUrl = await this.uploadImageToS3(file, file.name);
        console.log('☁️ URL recibida de S3:', thumbnailUrl);

        // Llenar el input thumbnail con la URL de S3
        if (currentFilter && thumbnailUrl) {
          currentFilter['thumbnail'] = thumbnailUrl;
          console.log('✅ Thumbnail URL asignada:', currentFilter['thumbnail']);
        } else {
          console.warn('⚠️ No se pudo asignar thumbnail URL:', {
            hasCurrentFilter: !!currentFilter,
            hasThumbnailUrl: !!thumbnailUrl
          });
        }
      } catch (s3Error) {
        console.warn(`⚠️ Error subiendo ${file.name} a S3:`, s3Error);
        if (currentFilter) {
          currentFilter['thumbnail'] = '';
        }
      }

      // 4. Obtener dirección si hay GPS
      if (metadata.latitude && metadata.longitude) {
        console.log(`🗺️ Obteniendo dirección para coordenadas: ${metadata.latitude}, ${metadata.longitude}`);
        this.getAddressFromCoords(metadata.latitude, metadata.longitude, imageId, currentFilterIndex);
      } else {
        console.log(`📍 No se encontraron coordenadas GPS en ${file.name}`);
      }

      // 5. Estado final del filtro
      console.log('📋 Estado final del filtro:', currentFilter);
      console.log('📋 Array completo de filtros:', this.filters);

      processedImage.processingState = {
        isProcessing: false,
        hasError: false
      };

      console.log(`✅ Imagen ${file.name} procesada correctamente`);

    } catch (error) {
      console.error(`❌ Error procesando imagen ${file.name}:`, error);
      processedImage.processingState = {
        isProcessing: false,
        hasError: true,
        errorMessage: 'Error al procesar la imagen'
      };
    }

    // Actualizar estado global
    this.updateGlobalProcessingState();
  }

// También agrega este log en la función getAddressFromCoords:
  getAddressFromCoords(lat: number, lng: number, imageId: string, filterIndex: number): void {
    console.log(`🌍 Solicitando dirección para coords: ${lat}, ${lng}, filterIndex: ${filterIndex}`);

    this.endpointService.getAddressFromCoords(lat, lng).subscribe({
      next: (response: any) => {
        console.log('🌍 Respuesta de dirección recibida:', response);

        const image = this.processedImages.find(img => img.id === imageId);
        if (image) {
          image.direccion = response.address;
        }

        // Verificar que el filtro aún existe
        if (this.filters[filterIndex]) {
          this.filters[filterIndex]['address'] = response.address;
          console.log(`✅ Dirección asignada en índice ${filterIndex}:`, response.address);
          console.log('📋 Filtro actualizado:', this.filters[filterIndex]);
        } else {
          console.error(`❌ No existe filtro en índice ${filterIndex}`);
        }
      },
      error: (err: any) => {
        console.error('❌ Error al obtener dirección:', err);
      }
    });
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

  addPanoramaInDataBase(): void {
    let successCount = 0;
    let errorCount = 0;
    const totalRecords = this.filters.length;

    // Validar que hay registros para procesar
    if (totalRecords === 0) {
      this.errorMessage = 'No hay registros para procesar';
      this.showErrorMessage = true;
      return;
    }

    // Validar que los registros tienen los campos requeridos
    const invalidRecords = this.filters.filter(filter =>
      !filter['filename'] ||
      !filter['latitude'] ||
      !filter['longitude']
    );

    if (invalidRecords.length > 0) {
      this.errorMessage = `${invalidRecords.length} registro(s) tienen campos requeridos vacíos (filename, latitude, longitude)`;
      this.showErrorMessage = true;
      return;
    }

    // Procesar cada filtro/registro
    this.filters.forEach((filter, index) => {
      const panoramaPayload = {
        id: 0,
        locationId: Number(filter['locationId']) || 0,
        filename: filter['filename'] || '',
        address: filter['address'] || '',
        viewerUrl: filter['viewerUrl'] || '', // Campo faltante
        thumbnail: filter['thumbnail'] || '',
        latitude: Number(filter['latitude']) || 0,
        longitude: Number(filter['longitude']) || 0,
        hasHotspots: Number(filter['hasHotspots']) || 0 // Campo faltante
      };

      console.log(`[Registro ${index + 1}] Enviando panorama:`, panoramaPayload);

      this.endpointService.postPanoramas(panoramaPayload).subscribe({
        next: (response) => {
          console.log(`[Registro ${index + 1}] Panorama guardado exitosamente:`, response);
          successCount++;

          // Verificar si todos los registros han sido procesados
          if (successCount + errorCount === totalRecords) {
            this.handleBatchComplete(successCount, errorCount, totalRecords);
          }
        },
        error: (err) => {
          console.error(`[Registro ${index + 1}] Error al guardar panorama:`, err);
          errorCount++;

          // Verificar si todos los registros han sido procesados
          if (successCount + errorCount === totalRecords) {
            this.handleBatchComplete(successCount, errorCount, totalRecords);
          }
        }
      });
    });
  }
  private handleBatchComplete(successCount: number, errorCount: number, totalRecords: number): void {
    if (successCount === totalRecords) {
      // Todos los registros se guardaron exitosamente
      console.log('Todos los registros guardados exitosamente');
      this.showSuccessModal = true;
      this.showErrorMessage = false;
    } else if (successCount > 0) {
      // Algunos registros se guardaron, otros fallaron
      this.errorMessage = `Se guardaron ${successCount} de ${totalRecords} registros. ${errorCount} fallaron.`;
      this.showErrorMessage = true;
      this.showSuccessModal = true; // Mostrar éxito parcial
    } else {
      // Todos los registros fallaron
      this.errorMessage = `Error: No se pudo guardar ningún registro (${errorCount} errores)`;
      this.showErrorMessage = true;
    }
  }
  closeModalAndReset(): void {
    this.showSuccessModal = false;
    this.closeHideOrbitCard();
    // Opcional: resetear los filtros
    this.filters = [this.createEmptyFilter(this.columnHeaders)];
  }
}
