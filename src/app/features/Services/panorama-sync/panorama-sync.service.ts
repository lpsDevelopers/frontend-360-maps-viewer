import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {Route, Router} from "@angular/router";

export interface PanoramaChangeEvent {
  panoramaId: number;
  panoramaData?: any;
  source: 'map' | 'vr' | 'hotspot';
}

@Injectable({
  providedIn: 'root'
})
export class PanoramaSyncService {
  private panoramaChangeSubject = new BehaviorSubject<PanoramaChangeEvent | null>(null);
  private currentPanoramaIdSubject = new BehaviorSubject<number | null>(null);
  private mapReinitSubject = new BehaviorSubject<boolean>(false);

  private clearMapSubject = new BehaviorSubject<boolean>(false);

  private vrReinitSubject = new BehaviorSubject<boolean>(false);
  private isInVrContext = false;

  constructor( private router : Router ) {
    console.log('[PanoramaSyncService] Servicio inicializado');
  }

  // PARA MAPAS
  requestMapReinit() {
    console.log('[PanoramaSyncService] Solicitando reinicialización del mapa');
    this.mapReinitSubject.next(true);
  }
  resetMapReinit() {
    this.mapReinitSubject.next(false);
  }
  getMapReinitObservable(): Observable<boolean> {
    return this.mapReinitSubject.asObservable();
  }
  
  triggerClearMap(): void {
    console.log('[PanoramaSyncService] triggerClearMap emitido');
    this.clearMapSubject.next(true);
  }

  getClearMapObservable(): Observable<boolean> {
    return this.clearMapSubject.asObservable();
  }
  // PARA VR

  enterVrContext() {
    console.log('[PanoramaSyncService] Entrando al contexto VR');
    this.isInVrContext = true;
  }
  exitVrContext() {
    console.log('[PanoramaSyncService] Saliendo del contexto VR');
    this.isInVrContext = false;
  }
  isInVrContextCurrent(): boolean {
    return this.isInVrContext;
  }
  requestVrReinit() {
    console.log('[PanoramaSyncService] Solicitando reinicialización del visor VR');
    this.vrReinitSubject.next(true);
  }
  resetVrReinit() {
    this.vrReinitSubject.next(true);
  }
  getVrReinitObservable(): Observable<boolean> {
    return this.vrReinitSubject.asObservable();
  }


  // PARA PANORAMA
  getPanoramaChange(): Observable<PanoramaChangeEvent | null> {
    console.log('[PanoramaSyncService] getPanoramaChange suscripción solicitada');
    return this.panoramaChangeSubject.asObservable();
  }

  getCurrentPanoramaId(): Observable<number | null> {
    console.log('[PanoramaSyncService] getCurrentPanoramaId suscripción solicitada');
    return this.currentPanoramaIdSubject.asObservable();
  }
  changePanorama(panoramaId: number, panoramaData?: any, source: 'map' | 'vr' | 'hotspot' = 'map') {
    console.log(`[PanoramaSyncService] Cambio de panorama solicitado:`, { panoramaId, source, panoramaData });

    // Si el cambio viene del mapa y no estamos en contexto VR, solicitar reinicialización
    if (source === 'map' && !this.isInVrContext) {
      console.log('[PanoramaSyncService] Cambio desde mapa fuera del contexto VR, solicitando reinicialización');
      this.requestVrReinit();
    }

    const changeEvent: PanoramaChangeEvent = {
      panoramaId,
      panoramaData,
      source
    };

    this.panoramaChangeSubject.next(changeEvent);
    console.log('[PanoramaSyncService] panoramaChangeSubject emitido', changeEvent);

    this.currentPanoramaIdSubject.next(panoramaId);
    console.log('[PanoramaSyncService] currentPanoramaIdSubject emitido', panoramaId);
  }

  // Se le puso 2 para evitar borrarlo pero no se utiliza dentro del componente vr 
  changePanorama2(panoramaId: number, panoramaData?: any, source: 'map' | 'vr' | 'hotspot' = 'map') {
    console.log(`[PanoramaSyncService] Cambio de panorama solicitado:`, { panoramaId, source, panoramaData });

    const changeEvent: PanoramaChangeEvent = {
      panoramaId,
      panoramaData,
      source
    };

    this.panoramaChangeSubject.next(changeEvent);
    console.log('[PanoramaSyncService] panoramaChangeSubject emitido', changeEvent);

    this.currentPanoramaIdSubject.next(panoramaId);
    console.log('[PanoramaSyncService] currentPanoramaIdSubject emitido', panoramaId);

  }

  getCurrentPanoramaIdSync(): number | null {
    const currentId = this.currentPanoramaIdSubject.value;
    console.log('[PanoramaSyncService] getCurrentPanoramaIdSync devuelto:', currentId);
    return currentId;
  }

  clearPanoramaChange() {
    console.log('[PanoramaSyncService] clearPanoramaChange llamado - reseteando estado');
    this.panoramaChangeSubject.next(null);
  }

  
}
