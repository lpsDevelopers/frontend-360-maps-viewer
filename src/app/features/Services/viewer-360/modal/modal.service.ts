import { Injectable } from '@angular/core';
import {Subject} from "rxjs";


export interface ModalData {
  id: number;
  label: string;
  description?: string;

  locationId: number;
  equipment_location: string;
  street_name: string;
  street_number: string;
  province: string;
  locality: string;
  postal_code: string;
  identifier: string;
  project: string;
  new_equipment_location: string;
  assigned_to: string;
  location_details: string;
  repair_type: string;
  repair_type_2: string;
  registration_date: string;
  latitude: number;
  longitude: number;
  additional_notes: string;
  other_repair_type_1: string;
  other_repair_type_2: string;
  theta: number;
  phi: number;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private openModalSource = new Subject<ModalData>();
  openModal$ = this.openModalSource.asObservable();

  openModal(data: ModalData) {
    this.openModalSource.next(data);
  }
}
