import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import * as L from 'leaflet';
import {CsvDataService} from "../../Services/csv-data/csv-data.service";


interface CsvLocation {
  id?: string;
  name?: string;
  latitud?: number;
  longitud?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: any; // Para campos adicionales del CSV
}

interface CsvState {
  locations: CsvLocation[];
  loading: boolean;
  error: string | null;
  fileName: string | null;
}

@Component({
  selector: 'app-csv-locations',
  templateUrl: './csv-locations.component.html',
  styleUrls: ['./csv-locations.component.scss']
})
export class CsvLocationsComponent implements OnInit, OnDestroy {
  @Input() map: L.Map | null = null; // Recibe el mapa desde el componente padre
  @Input() locationId: number | null = null; // ID de la ubicación actual
  @Output() csvLoaded = new EventEmitter<CsvLocation[]>();
  @Output() csvError = new EventEmitter<string>();

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();
  private csvLayerGroup: L.LayerGroup | null = null;

  csvState: CsvState = {
    locations: [],
    loading: false,
    error: null,
    fileName: null
  };

  // Control de vista expandida
  isExpandedView: boolean = false;

  constructor(private csvDataService: CsvDataService) {}

  ngOnInit(): void {
    console.log('[CsvLocations] Componente inicializado para locationId:', this.locationId);

    // Cargar datos CSV guardados si existen
    if (this.locationId) {
      const savedCsvData = this.getSavedCsvData(this.locationId);
      if (savedCsvData) {
        this.updateState({
          locations: savedCsvData,
          loading: false,
          error: null,
          fileName: 'Datos guardados'
        });
        this.updateCsvMarkers();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearCsvMarkers();
  }

  // Método para abrir el selector de archivos
  onSelectCsvFile(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  // Método llamado cuando se selecciona un archivo
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.loadCsvFile(file);
    }
  }

  // Cargar y procesar archivo CSV
  private loadCsvFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.updateState({
        error: 'Por favor selecciona un archivo CSV válido',
        loading: false
      });
      return;
    }

    this.updateState({
      loading: true,
      error: null,
      fileName: file.name
    });

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const locations = this.parseCsv(csvText);

        this.updateState({
          locations: locations,
          loading: false,
          error: null
        });

        // Guardar datos CSV
        if (this.locationId) {
          this.saveCsvData(this.locationId, locations);
          // NUEVO: Notificar al servicio compartido
          this.csvDataService.setCsvData(this.locationId, locations, file.name);
        }

        this.csvLoaded.emit(locations);
        this.updateCsvMarkers();

        console.log(`[CsvLocations] CSV cargado: ${locations.length} ubicaciones`);
      } catch (error) {
        const errorMsg = 'Error al procesar el archivo CSV: ' + (error as Error).message;
        this.updateState({
          error: errorMsg,
          loading: false
        });
        this.csvError.emit(errorMsg);
        console.error('[CsvLocations] Error:', error);
      }
    };

    reader.onerror = () => {
      const errorMsg = 'Error al leer el archivo';
      this.updateState({
        error: errorMsg,
        loading: false
      });
      this.csvError.emit(errorMsg);
    };

    reader.readAsText(file);
  }

  // Parser de CSV - VERSIÓN CORREGIDA
  private parseCsv(csvText: string): CsvLocation[] {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos');
    }

    // Función para parsear una línea CSV respetando comillas
    const parseCSVLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result.map(val => val.replace(/^"|"$/g, '')); // Remover comillas
    };

    // Obtener encabezados originales
    const originalHeaders = parseCSVLine(lines[0]);
    console.log('[CsvLocations] *** DEBUGGING HEADERS ***');
    console.log('Encabezados originales:', originalHeaders);
    console.log('Total columnas:', originalHeaders.length);

    // Buscar específicamente las columnas que necesitamos
    const latIndex = this.findExactColumn(originalHeaders, ['latitudS', 'Latitud S', 'latitud S', 'LatitudS', 'latitud_s']);
    const lngIndex = this.findExactColumn(originalHeaders, ['longitudW', 'Longitud W', 'longitud W', 'LongitudW', 'longitud_w']);

    console.log('[CsvLocations] *** ÍNDICES ENCONTRADOS ***');
    console.log(`Latitud encontrada en índice: ${latIndex} (${latIndex >= 0 ? originalHeaders[latIndex] : 'NO ENCONTRADA'})`);
    console.log(`Longitud encontrada en índice: ${lngIndex} (${lngIndex >= 0 ? originalHeaders[lngIndex] : 'NO ENCONTRADA'})`);

    if (latIndex === -1 || lngIndex === -1) {
      console.error('[CsvLocations] *** ERROR: COLUMNAS NO ENCONTRADAS ***');
      console.error('Columnas disponibles:', originalHeaders);

      // Mostrar columnas que contienen "latitud" o "longitud"
      const possibleLatCols = originalHeaders.filter((h, i) =>
        h.toLowerCase().includes('latitud') || h.toLowerCase().includes('lat')
      );
      const possibleLngCols = originalHeaders.filter((h, i) =>
        h.toLowerCase().includes('longitud') || h.toLowerCase().includes('lng') || h.toLowerCase().includes('lon')
      );

      console.error('Posibles columnas de latitud encontradas:', possibleLatCols);
      console.error('Posibles columnas de longitud encontradas:', possibleLngCols);

      throw new Error(`No se encontraron las columnas exactas 'latitudS' y 'longitudW'.
      Columnas disponibles: ${originalHeaders.join(', ')}
      Posibles latitud: ${possibleLatCols.join(', ')}
      Posibles longitud: ${possibleLngCols.join(', ')}`);
    }

    // Mostrar algunas filas de ejemplo para debugging
    console.log('[CsvLocations] *** EJEMPLO DE DATOS ***');
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      const values = parseCSVLine(lines[i]);
      console.log(`Fila ${i}:`);
      console.log(`  Latitud (${originalHeaders[latIndex]}): "${values[latIndex]}"`);
      console.log(`  Longitud (${originalHeaders[lngIndex]}): "${values[lngIndex]}"`);
    }

    const locations: CsvLocation[] = [];

    // Procesar cada fila de datos
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length >= Math.max(latIndex, lngIndex) + 1) {
        const latValue = values[latIndex];
        const lngValue = values[lngIndex];

        const lat = this.parseCoordinate(latValue);
        const lng = this.parseCoordinate(lngValue);

        if (lat !== null && lng !== null) {
          const location: CsvLocation = {
            id: values[0] || `csv-${i}`,
            latitud: lat,
            longitud: lng,
            latitude: lat, // Alias para compatibilidad
            longitude: lng, // Alias para compatibilidad
          };

          // Agregar otros campos del CSV usando los headers originales
          originalHeaders.forEach((header, index) => {
            if (index !== latIndex && index !== lngIndex && values[index] && values[index].trim() !== '') {
              location[header.trim()] = values[index].trim();
            }
          });

          locations.push(location);
        } else {
          console.warn(`[CsvLocations] Fila ${i}: Coordenadas inválidas - lat: "${latValue}" lng: "${lngValue}"`);
        }
      }
    }

    if (locations.length === 0) {
      throw new Error('No se encontraron coordenadas válidas en el archivo CSV. Verifica que las coordenadas estén en formato numérico.');
    }

    console.log(`[CsvLocations] *** RESUMEN FINAL ***`);
    console.log(`Procesadas ${locations.length} ubicaciones válidas de ${lines.length - 1} filas`);

    return locations;
  }

  // Nueva función para buscar columnas exactas
  private findExactColumn(headers: string[], searchTerms: string[]): number {
    for (const term of searchTerms) {
      // Buscar coincidencia exacta (case-insensitive)
      const exactIndex = headers.findIndex(h =>
        h.trim().toLowerCase() === term.toLowerCase()
      );
      if (exactIndex !== -1) {
        console.log(`[CsvLocations] Coincidencia exacta encontrada: "${term}" en "${headers[exactIndex]}" (índice ${exactIndex})`);
        return exactIndex;
      }
    }

    // Si no encuentra coincidencia exacta, buscar que contenga el término
    for (const term of searchTerms) {
      const partialIndex = headers.findIndex(h =>
        h.trim().toLowerCase().includes(term.toLowerCase().replace(/\s/g, ''))
      );
      if (partialIndex !== -1) {
        console.log(`[CsvLocations] Coincidencia parcial encontrada: "${term}" en "${headers[partialIndex]}" (índice ${partialIndex})`);
        return partialIndex;
      }
    }

    return -1;
  }

  // Parsear coordenada (maneja diferentes formatos y números negativos)
  private parseCoordinate(value: string): number | null {
    if (!value || value.trim() === '') return null;

    // Limpiar el valor
    let cleaned = value.toString().trim();

    // Remover caracteres comunes no numéricos excepto punto, coma decimal, y signo negativo
    cleaned = cleaned.replace(/[°'"]/g, '');

    // Manejar coma decimal (reemplazar por punto)
    cleaned = cleaned.replace(',', '.');

    // Remover espacios extra
    cleaned = cleaned.trim();

    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      return null;
    }

    // Validar rangos válidos para coordenadas
    if (Math.abs(parsed) > 180) {
      return null;
    }

    return parsed;
  }

  // Actualizar marcadores en el mapa
  private updateCsvMarkers(): void {
    if (!this.map || !this.csvState.locations.length) {
      console.log('[CsvLocations] No hay mapa o ubicaciones para mostrar');
      return;
    }

    this.clearCsvMarkers();
    this.csvLayerGroup = L.layerGroup();

    let markersAdded = 0;

    this.csvState.locations.forEach((location, index) => {
      if (location.latitud && location.longitud) {
        // Crear marcador morado
        const marker = L.circleMarker(
          [location.latitud, location.longitud],
          {
            radius: 8,
            color: '#800080', // Morado
            fillColor: 'rgba(128, 0, 128, 0.3)',
            fillOpacity: 0.6,
            weight: 3,
            opacity: 1
          }
        );

        // Crear popup con información
        const popupContent = this.createPopupContent(location, index);
        marker.bindPopup(popupContent);

        // Hover effect
        marker.on('mouseover', () => {
          marker.setStyle({
            radius: 10,
            weight: 4,
            fillOpacity: 0.8
          });
        });

        marker.on('mouseout', () => {
          marker.setStyle({
            radius: 8,
            weight: 3,
            fillOpacity: 0.6
          });
        });

        this.csvLayerGroup!.addLayer(marker);
        markersAdded++;
      }
    });

    if (markersAdded > 0) {
      this.csvLayerGroup.addTo(this.map);
      console.log(`[CsvLocations] Se agregaron ${markersAdded} marcadores morados`);

      // Ajustar vista si hay marcadores
      this.fitMapToCsvLocations();
    }
  }

  // Crear contenido del popup
  private createPopupContent(location: CsvLocation, index: number): string {
    let content = `<div class="csv-popup">`;
    content += `<h4>Punto CSV #${index + 1}</h4>`;
    content += `<p><strong>Lat:</strong> ${location.latitud?.toFixed(6)}</p>`;
    content += `<p><strong>Lng:</strong> ${location.longitud?.toFixed(6)}</p>`;

    // Agregar otros campos disponibles
    Object.keys(location).forEach(key => {
      if (!['id', 'latitud', 'longitud', 'latitude', 'longitude'].includes(key) && location[key]) {
        content += `<p><strong>${this.capitalizeFirst(key)}:</strong> ${location[key]}</p>`;
      }
    });

    content += `</div>`;
    return content;
  }

  // Capitalizar primera letra
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Ajustar vista del mapa a las ubicaciones CSV
  private fitMapToCsvLocations(): void {
    if (!this.map || !this.csvState.locations.length) return;

    const validLocations = this.csvState.locations.filter(loc =>
      loc.latitud && loc.longitud
    );

    if (validLocations.length === 0) return;

    if (validLocations.length === 1) {
      const loc = validLocations[0];
      this.map.setView([loc.latitud!, loc.longitud!], 15);
    } else {
      const bounds = L.latLngBounds(
        validLocations.map(loc => [loc.latitud!, loc.longitud!])
      );
      this.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  // Limpiar marcadores CSV
  private clearCsvMarkers(): void {
    if (this.csvLayerGroup && this.map) {
      this.map.removeLayer(this.csvLayerGroup);
      this.csvLayerGroup = null;
    }
  }

  // Método público para limpiar CSV
  clearCsv(): void {
    this.clearCsvMarkers();
    this.updateState({
      locations: [],
      loading: false,
      error: null,
      fileName: null
    });

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }

    // Limpiar datos guardados
    if (this.locationId) {
      this.clearSavedCsvData(this.locationId);
      // NUEVO: Notificar al servicio compartido
      this.csvDataService.clearCsvData(this.locationId);
    }
  }

  // Actualizar estado
  private updateState(partialState: Partial<CsvState>): void {
    this.csvState = { ...this.csvState, ...partialState };
  }

  // Método público para obtener ubicaciones CSV
  getCsvLocations(): CsvLocation[] {
    return this.csvState.locations;
  }

  // Método público para verificar si hay datos CSV cargados
  hasCsvData(): boolean {
    return this.csvState.locations.length > 0;
  }

  // Obtener rango de coordenadas para mostrar en el resumen
  getCoordinateRange(): string | null {
    if (!this.csvState.locations.length) return null;

    const lats = this.csvState.locations.map(loc => loc.latitud!).filter(lat => lat !== undefined);
    const lngs = this.csvState.locations.map(loc => loc.longitud!).filter(lng => lng !== undefined);

    if (lats.length === 0 || lngs.length === 0) return null;

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return `${minLat.toFixed(4)},${minLng.toFixed(4)} - ${maxLat.toFixed(4)},${maxLng.toFixed(4)}`;
  }

  // Guardar datos CSV en localStorage
  private saveCsvData(locationId: number, data: CsvLocation[]): void {
    try {
      const key = `csv_data_location_${locationId}`;
      localStorage.setItem(key, JSON.stringify({
        locationId,
        data,
        timestamp: Date.now(),
        fileName: this.csvState.fileName
      }));
      console.log(`[CsvLocations] Datos guardados para ubicación ${locationId}`);
    } catch (error) {
      console.error('Error al guardar datos CSV:', error);
    }
  }

  // Obtener datos CSV guardados
  private getSavedCsvData(locationId: number): CsvLocation[] | null {
    try {
      const key = `csv_data_location_${locationId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.data || null;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener datos CSV guardados:', error);
      return null;
    }
  }

  // Limpiar datos CSV guardados
  private clearSavedCsvData(locationId: number): void {
    try {
      const key = `csv_data_location_${locationId}`;
      localStorage.removeItem(key);
      console.log(`[CsvLocations] Datos CSV eliminados para ubicación ${locationId}`);
    } catch (error) {
      console.error('Error al eliminar datos CSV:', error);
    }
  }

  // Toggle vista expandida
  toggleExpandedView(): void {
    this.isExpandedView = !this.isExpandedView;
  }

  // TrackBy function para mejorar rendimiento
  trackByIndex(index: number, item: any): number {
    return index;
  }

  // Obtener campos extra del CSV (excluyendo coordenadas)
  getExtraFields(location: CsvLocation): {key: string, value: any}[] | null {
    const excludeFields = ['id', 'latitud', 'longitud', 'latitude', 'longitude', 'name'];
    const extraFields: {key: string, value: any}[] = [];

    Object.keys(location).forEach(key => {
      if (!excludeFields.includes(key) && location[key] && location[key] !== '') {
        extraFields.push({
          key: this.capitalizeFirst(key),
          value: location[key]
        });
      }
    });

    return extraFields.length > 0 ? extraFields : null;
  }
}
