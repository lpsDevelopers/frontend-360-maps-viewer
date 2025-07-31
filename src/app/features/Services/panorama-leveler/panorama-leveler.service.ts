import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface PanoramaLevelData {
  panoramaId: number;
  rollAngle: number; // Ángulo de inclinación en grados
  pitchAngle: number; // Ángulo vertical (opcional)
  yawAngle: number; // Ángulo horizontal (opcional)
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PanoramaLevelerService {
  private readonly STORAGE_KEY = 'panorama_levels';
  private currentLevelData = new BehaviorSubject<PanoramaLevelData | null>(null);
  private isLevelerActive = new BehaviorSubject<boolean>(false);

  // Observables públicos
  public currentLevel$ = this.currentLevelData.asObservable();
  public levelerActive$ = this.isLevelerActive.asObservable();

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  /**
   * Activa/desactiva el modo nivelador
   */
  toggleLeveler(active: boolean): void {
    this.isLevelerActive.next(active);
    console.log(`🎚️ Nivelador ${active ? 'activado' : 'desactivado'}`);
  }

  /**
   * Carga los datos de nivelación para un panorama específico
   */
  async loadLevelData(panoramaId: number): Promise<PanoramaLevelData | null> {
    try {
      // Intentar cargar desde el servidor primero
      const serverData = await this.loadFromServer(panoramaId);
      if (serverData) {
        this.currentLevelData.next(serverData);
        return serverData;
      }

      // Si no hay datos en servidor, cargar desde localStorage
      const localData = this.loadFromLocalStorage(panoramaId);
      if (localData) {
        this.currentLevelData.next(localData);
        return localData;
      }

      // Si no hay datos, crear entrada por defecto
      const defaultData: PanoramaLevelData = {
        panoramaId,
        rollAngle: 0,
        pitchAngle: 0,
        yawAngle: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.currentLevelData.next(defaultData);
      return defaultData;

    } catch (error) {
      console.error('Error cargando datos de nivelación:', error);
      return null;
    }
  }

  /**
   * Guarda los datos de nivelación
   */
  async saveLevelData(data: Partial<PanoramaLevelData>): Promise<boolean> {
    const current = this.currentLevelData.value;
    if (!current) return false;

    const updatedData: PanoramaLevelData = {
      ...current,
      ...data,
      updatedAt: new Date()
    };

    try {
      // Guardar en servidor
      await this.saveToServer(updatedData);

      // Guardar en localStorage como backup
      this.saveToLocalStorage(updatedData);

      // Actualizar estado actual
      this.currentLevelData.next(updatedData);

      console.log(`💾 Nivelación guardada para panorama ${updatedData.panoramaId}:`, {
        roll: updatedData.rollAngle,
        pitch: updatedData.pitchAngle,
        yaw: updatedData.yawAngle
      });

      return true;
    } catch (error) {
      console.error('Error guardando datos de nivelación:', error);

      // Si falla el servidor, al menos guardar localmente
      this.saveToLocalStorage(updatedData);
      this.currentLevelData.next(updatedData);
      return false;
    }
  }

  /**
   * Actualiza solo el ángulo de roll (inclinación lateral)
   */
  async updateRollAngle(panoramaId: number, rollAngle: number): Promise<void> {
    await this.saveLevelData({ panoramaId, rollAngle });
  }

  /**
   * Actualiza todos los ángulos de una vez
   */
  async updateAllAngles(panoramaId: number, roll: number, pitch: number = 0, yaw: number = 0): Promise<void> {
    await this.saveLevelData({
      panoramaId,
      rollAngle: roll,
      pitchAngle: pitch,
      yawAngle: yaw
    });
  }

  /**
   * Resetea la nivelación de un panorama
   */
  async resetLevel(panoramaId: number): Promise<void> {
    await this.saveLevelData({
      panoramaId,
      rollAngle: 0,
      pitchAngle: 0,
      yawAngle: 0
    });
  }

  /**
   * Obtiene el ángulo de roll actual
   */
  getCurrentRollAngle(): number {
    return this.currentLevelData.value?.rollAngle || 0;
  }

  /**
   * Obtiene todos los datos actuales
   */
  getCurrentLevelData(): PanoramaLevelData | null {
    return this.currentLevelData.value;
  }

  // MÉTODOS PRIVADOS PARA PERSISTENCIA

  private async loadFromServer(panoramaId: number): Promise<PanoramaLevelData | null> {
    try {
      const response = await this.http.get<PanoramaLevelData>(
        `/api/panoramas/${panoramaId}/level-data`
      ).toPromise();
      return response || null;
    } catch (error) {
      console.warn('No se pudieron cargar datos del servidor:', error);
      return null;
    }
  }

  private async saveToServer(data: PanoramaLevelData): Promise<void> {
    await this.http.put(`/api/panoramas/${data.panoramaId}/level-data`, data).toPromise();
  }

  private loadFromLocalStorage(panoramaId: number): PanoramaLevelData | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const allData: { [key: number]: PanoramaLevelData } = JSON.parse(stored);
      const data = allData[panoramaId];

      if (data) {
        // Convertir strings de fecha a objetos Date
        data.createdAt = new Date(data.createdAt);
        data.updatedAt = new Date(data.updatedAt);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error cargando desde localStorage:', error);
      return null;
    }
  }

  private saveToLocalStorage(data: PanoramaLevelData): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const allData: { [key: number]: PanoramaLevelData } = stored ? JSON.parse(stored) : {};

      allData[data.panoramaId] = data;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    // Cargar datos generales si es necesario
    console.log('🔄 Servicio de nivelación inicializado');
  }

  /**
   * Exportar todas las configuraciones de nivelación
   */
  exportLevelData(): string {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored || '{}';
  }

  /**
   * Importar configuraciones de nivelación
   */
  importLevelData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('✅ Datos de nivelación importados correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error importando datos:', error);
      return false;
    }
  }

  /**
   * Limpiar todos los datos de nivelación
   */
  clearAllLevelData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentLevelData.next(null);
    console.log('🗑️ Todos los datos de nivelación eliminados');
  }

  /**
   * Obtener estadísticas de uso
   */
  getLevelingStats(): {
    totalPanoramas: number,
    leveledPanoramas: number,
    avgRollAngle: number
  } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return { totalPanoramas: 0, leveledPanoramas: 0, avgRollAngle: 0 };

      const allData: { [key: number]: PanoramaLevelData } = JSON.parse(stored);
      const entries = Object.values(allData);
      const leveledEntries = entries.filter(entry => entry.rollAngle !== 0);
      const avgRoll = leveledEntries.length > 0
        ? leveledEntries.reduce((sum, entry) => sum + Math.abs(entry.rollAngle), 0) / leveledEntries.length
        : 0;

      return {
        totalPanoramas: entries.length,
        leveledPanoramas: leveledEntries.length,
        avgRollAngle: Math.round(avgRoll * 100) / 100
      };
    } catch (error) {
      console.error('Error calculando estadísticas:', error);
      return { totalPanoramas: 0, leveledPanoramas: 0, avgRollAngle: 0 };
    }
  }
}
