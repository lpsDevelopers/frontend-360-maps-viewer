import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Subscription} from "rxjs";
import {ModalService} from "../../../features/Services/viewer-360/modal/modal.service";
import * as Papa from 'papaparse';
import {EndpointService} from "../../../features/Services/endpoint/endpoint.service";
import {AdminEndpointService} from "../../Services/endpoint/admin-endpoint.service";

@Component({
  selector: 'app-modal-panel',
  templateUrl: './modal-panel.component.html',
  styleUrls: ['./modal-panel.component.scss']
})
export class ModalPanelComponent implements OnInit, OnDestroy {
  @Input() headers: string[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() filtersApplied = new EventEmitter<any[]>();
  showSuccessModal = false;
  filters: any[] = [];
  availableFields: string[] = [];
  private headerSubscription: Subscription = new Subscription();
  debug: boolean = true;

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

  showSaveConfigModal: boolean = false;
  configurationName: string = '';

  savedConfigurations: any[] = ['0d', '1', '2', '3'];

  currentLayout: 'Hotspots' | 'Panoramas' | 'Locations' | 'Companies'  = 'Hotspots';

  columnHeaders: string[] = [];

  addRecords: any[] = [
    {
      id: '1',
      name: 'Postes',
      headers: [
         'item','codigoPosteAntiguo', 'pitch', 'yaw', 'theta', 'phi', 'tipoPoste', 'criticidad', 'red',
        'tipoRed', 'alturaSoporte', 'alturaVano', 'codigoDistrito', 'tipoVia', 'nombreVia',
        'numero', 'manzana', 'lote', 'coordenadas', 'latitudS', 'longitudW', 'urbanizacion',
        'posteSiguiente', 'observacion1', 'observacion2', 'observacion3', 'condicion', 'trabajoARealizar',
        'panoramasId', 'viewCapturePath', 'filePath1', 'filePath2', 'filePath3', 'locationId'
      ],
    },
  ];

  selectedConfigId: string | null = null;

  constructor(
    private endpointService: AdminEndpointService,
    private modalService: ModalService
  ) {
    this.addFilter();
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

    const postes = this.addRecords.find(r => r.id === '1');
    if (postes) {
      this.columnHeaders = postes.headers;
      this.filters = [this.createEmptyFilter(this.columnHeaders)];
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
    headers.forEach(h => row[h] = '');
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

  addPostesInDataBase(): void {
    let successCount = 0;
    let errorCount = 0;
    const totalRecords = this.filters.length;

    // Validar que hay registros para procesar
    if (totalRecords === 0) {
      this.errorMessage = 'No hay registros para procesar';
      this.showErrorMessage = true;
      return;
    }

    // Validar que los registros tienen los campos requeridos básicos
    const invalidRecords = this.filters.filter(filter =>
      !filter['latitudS'] ||
      !filter['longitudW'] ||
      !filter['item']
    );

    if (invalidRecords.length > 0) {
      this.errorMessage = `${invalidRecords.length} registro(s) tienen campos requeridos vacíos (item, latitudS, longitudW)`;
      this.showErrorMessage = true;
      return;
    }

    // Procesar cada filtro/registro
    this.filters.forEach((filter, index) => {
      const postePayload = {
        item: filter['item'] || '',
        codigoPosteAntiguo: filter['codigoPosteAntiguo'] || '',
        pitch: Number(filter['pitch']) || 0,
        yaw: Number(filter['yaw']) || 0,
        theta: Number(filter['theta']) || 0,
        phi: Number(filter['phi']) || 0,
        tipoPoste: filter['tipoPoste'] || '',
        criticidad: filter['criticidad'] || '',
        red: filter['red'] || '',
        tipoRed: filter['tipoRed'] || '',
        alturaSoporte: Number(filter['alturaSoporte']) || 0,
        alturaVano: Number(filter['alturaVano']) || 0,
        codigoDistrito: filter['codigoDistrito'] || '',
        tipoVia: filter['tipoVia'] || '',
        nombreVia: filter['nombreVia'] || '',
        numero: filter['numero'] || '',
        manzana: filter['manzana'] || '',
        lote: filter['lote'] || '',
        coordenadas: filter['coordenadas'] || '',
        latitudS: filter['latitudS'] || '',
        longitudW: filter['longitudW'] || '',
        urbanizacion: filter['urbanizacion'] || '',
        posteSiguiente: filter['posteSiguiente'] || '',
        observacion1: filter['observacion1'] || '',
        observacion2: filter['observacion2'] || '',
        observacion3: filter['observacion3'] || '',
        condicion: filter['condicion'] || '',
        trabajoARealizar: filter['trabajoARealizar'] || '',
        panoramasId: Number(filter['panoramasId']) || 1,
        viewCapturePath: Number(filter['viewCapturePath']) || 0,
        filePath1: filter['filePath1'] || '',
        filePath2: filter['filePath2'] || '',
        filePath3: filter['filePath3'] || ''
      };

      console.log(`[Registro ${index + 1}] Enviando poste:`, postePayload);

      this.endpointService.postPostes(postePayload).subscribe({
        next: (response) => {
          console.log(`[Registro ${index + 1}] Poste guardado exitosamente:`, response);
          successCount++;

          // Verificar si todos los registros han sido procesados
          if (successCount + errorCount === totalRecords) {
            this.handleBatchComplete(successCount, errorCount, totalRecords);
          }
        },
        error: (err) => {
          console.error(`[Registro ${index + 1}] Error al guardar poste:`, err);

          // Mostrar errores específicos de validación
          if (err.error && err.error.errors) {
            console.error(`[Registro ${index + 1}] Errores de validación:`, err.error.errors);
          }

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
  isRequiredField(fieldName: string): boolean {
    const requiredFields = ['item', 'latitudS', 'longitudW'];
    return requiredFields.includes(fieldName);
  }

  isFieldEmpty(value: any): boolean {
    return !value || value.toString().trim() === '';
  }
}
