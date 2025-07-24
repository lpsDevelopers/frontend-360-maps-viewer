import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import {Hotspot} from "../../../Model/types";

@Injectable({
  providedIn: 'root'
})
export class OpenHotspotService {
  // Subject for opening modal with data
  private openBarHotspot = new Subject<Hotspot>();
  openModal$ = this.openBarHotspot.asObservable();

  // Subject for closing modal
  private closeBarHotspot = new Subject<void>();
  closeModal$ = this.closeBarHotspot.asObservable();

  // BehaviorSubject to track modal state
  private isModalOpenSubject = new BehaviorSubject<boolean>(false);
  isModalOpen$ = this.isModalOpenSubject.asObservable();

  // BehaviorSubject to store current modal data
  private currentModalDataSubject = new BehaviorSubject<Hotspot | null>(null);
  currentModalData$ = this.currentModalDataSubject.asObservable();

  constructor() { }

  /**
   * Opens the hotspot modal with the provided data
   * @param data - The modal data to display
   * @returns boolean indicating success
   */
  openBar(data: Hotspot): boolean {
    try {
      this.openBarHotspot.next(data);
      this.currentModalDataSubject.next(data);
      this.isModalOpenSubject.next(true);
      console.log('OpenHotspotService → Modal opened with data:', data);
      return true;
    } catch (error) {
      console.error('OpenHotspotService → Error opening modal:', error);
      return false;
    }
  }

  /**
   * Closes the hotspot modal
   * @returns boolean indicating success
   */
  closeBar(): boolean {
    try {
      this.closeBarHotspot.next();
      this.currentModalDataSubject.next(null);
      this.isModalOpenSubject.next(false);
      console.log('OpenHotspotService → Modal closed');
      return true;
    } catch (error) {
      console.error('OpenHotspotService → Error closing modal:', error);
      return false;
    }
  }

  /**
   * Gets the current modal open state
   * @returns boolean indicating if modal is open
   */
  get isModalOpen(): boolean {
    return this.isModalOpenSubject.value;
  }

  /**
   * Gets the current modal data
   * @returns current modal data or null
   */
  get currentModalData(): Hotspot | null {
    return this.currentModalDataSubject.value;
  }

  /**
   * Toggles the modal state
   * @param data - Optional data to open with, if toggling to open
   * @returns boolean indicating the new state (true = open, false = closed)
   */
  toggleModal(data?: Hotspot): boolean {
    if (this.isModalOpen) {
      this.closeBar();
      return false;
    } else {
      if (data) {
        this.openBar(data);
        return true;
      } else {
        console.warn('OpenHotspotService → Cannot open modal without data');
        return false;
      }
    }
  }

  /**
   * Updates the current modal data without closing/reopening
   * @param data - New data to display
   * @returns boolean indicating success
   */
  updateModalData(data: Hotspot): boolean {
    if (!this.isModalOpen) {
      console.warn('OpenHotspotService → Cannot update data when modal is closed');
      return false;
    }

    try {
      this.currentModalDataSubject.next(data);
      this.openBarHotspot.next(data);
      console.log('OpenHotspotService → Modal data updated:', data);
      return true;
    } catch (error) {
      console.error('OpenHotspotService → Error updating modal data:', error);
      return false;
    }
  }

  /**
   * Method to be called by component when modal is closed
   * This allows the service to be notified when the component closes itself
   */
  notifyModalClosed(): void {
    if (this.isModalOpen) {
      this.currentModalDataSubject.next(null);
      this.isModalOpenSubject.next(false);
      console.log('OpenHotspotService → Notified that modal was closed by component');
    }
  }

  /**
   * Cleanup method to reset all subjects
   * Useful for testing or when the service needs to be reset
   */
  reset(): void {
    this.currentModalDataSubject.next(null);
    this.isModalOpenSubject.next(false);
    console.log('OpenHotspotService → Service reset');
  }
}
