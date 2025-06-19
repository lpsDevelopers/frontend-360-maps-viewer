import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {Panorama} from "../../../Model/types";


const STORAGE_KEY = 'stored_panoramas';

@Injectable({
  providedIn: 'root'
})
export class StoredPanoramasService {

  private panoramasSubject = new BehaviorSubject<Panorama[]>([]);
  public panoramas$ = this.panoramasSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const storedPanoramas = JSON.parse(data);
        this.panoramasSubject.next(storedPanoramas);
      } catch (e) {
        console.error('Error parsing panoramas from localStorage', e);
        this.panoramasSubject.next([]);
      }
    } else {
      this.panoramasSubject.next([]);
    }
  }

  private saveToStorage(panoramas: Panorama[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panoramas));
  }

  setPanoramas(panoramas: Panorama[]): void {
    this.panoramasSubject.next(panoramas);
    this.saveToStorage(panoramas);
  }

  getPanoramas(): Panorama[] {
    return this.panoramasSubject.getValue();
  }

  getPanoramaById(id: number): Panorama | undefined {
    return this.getPanoramas().find(pano => pano.id === id);
  }

  clearPanoramas(): void {
    this.panoramasSubject.next([]);
    localStorage.removeItem(STORAGE_KEY);
  }
}
