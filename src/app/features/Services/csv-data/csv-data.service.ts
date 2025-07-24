import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable} from "rxjs";

export interface CsvDataPayload {
  locationId: number;
  csvData: any[];
  fileName?: string;
  timestamp: number;
}


@Injectable({
  providedIn: 'root'
})
export class CsvDataService {
  private csvDataSubject = new BehaviorSubject<CsvDataPayload | null>(null);
  private allCsvDataSubject = new BehaviorSubject<Map<number, any[]>>(new Map());

  constructor() {
    console.log('[CsvDataService] Servicio inicializado');
  }
  setCsvData(locationId: number, csvData: any[], fileName?: string): void {
    const payload: CsvDataPayload = {
      locationId,
      csvData,
      fileName,
      timestamp: Date.now()
    };

    console.log(`[CsvDataService] Estableciendo datos CSV para ubicación ${locationId}:`, csvData.length, 'puntos');

    // Actualizar el subject principal
    this.csvDataSubject.next(payload);

    // Actualizar el mapa de todos los datos
    const currentMap = this.allCsvDataSubject.value;
    currentMap.set(locationId, csvData);
    this.allCsvDataSubject.next(new Map(currentMap));
  }

  // Limpiar datos CSV de una ubicación
  clearCsvData(locationId: number): void {
    console.log(`[CsvDataService] Limpiando datos CSV para ubicación ${locationId}`);

    const currentMap = this.allCsvDataSubject.value;
    currentMap.delete(locationId);
    this.allCsvDataSubject.next(new Map(currentMap));

    // Si era la ubicación activa, limpiar también el subject principal
    const currentPayload = this.csvDataSubject.value;
    if (currentPayload && currentPayload.locationId === locationId) {
      this.csvDataSubject.next(null);
    }
  }

  // Limpiar todos los datos CSV
  clearAllCsvData(): void {
    console.log('[CsvDataService] Limpiando todos los datos CSV');
    this.csvDataSubject.next(null);
    this.allCsvDataSubject.next(new Map());
  }

  // Obtener observable de datos CSV activos
  getCsvData(): Observable<CsvDataPayload | null> {
    return this.csvDataSubject.asObservable();
  }

  // Obtener observable de todos los datos CSV
  getAllCsvData(): Observable<Map<number, any[]>> {
    return this.allCsvDataSubject.asObservable();
  }

  // Obtener datos CSV actuales (sin observable)
  getCurrentCsvData(): CsvDataPayload | null {
    return this.csvDataSubject.value;
  }

  // Obtener datos CSV de una ubicación específica
  getCsvDataForLocation(locationId: number): any[] {
    const currentMap = this.allCsvDataSubject.value;
    return currentMap.get(locationId) || [];
  }

  // Verificar si una ubicación tiene datos CSV
  hasDataForLocation(locationId: number): boolean {
    const currentMap = this.allCsvDataSubject.value;
    return currentMap.has(locationId) && currentMap.get(locationId)!.length > 0;
  }

  // Obtener estadísticas
  getStats(): { totalLocations: number; totalPoints: number } {
    const currentMap = this.allCsvDataSubject.value;
    let totalPoints = 0;

    currentMap.forEach(data => {
      totalPoints += data.length;
    });

    return {
      totalLocations: currentMap.size,
      totalPoints
    };
  }
}
