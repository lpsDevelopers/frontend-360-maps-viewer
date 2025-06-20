import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { OpenHotspotService } from '../../../Services/viewer-360/openHotspot/open-hotspot.service';
import { ModalData } from '../../../Services/viewer-360/modal/modal.service';

@Component({
  selector: 'app-open-hotspot',
  templateUrl: './open-hotspot.component.html',
  styleUrls: ['./open-hotspot.component.scss'],
  animations: [
    trigger('slideIn', [
      state('in', style({transform: 'translateX(0)'})),
      transition('void => *', [
        style({transform: 'translateX(100%)'}),
        animate(300)
      ]),
      transition('* => void', [
        animate(300, style({transform: 'translateX(100%)'}))
      ])
    ])
  ]
})
export class OpenHotspotComponent implements OnInit, OnDestroy {

  visible = false;
  private subscription: Subscription = new Subscription();

  private closeSubscription?: Subscription;

  modalData: ModalData = {
    id: 0,
    label: '',
    description: '',
    locationId: 0,
    equipment_location: '',
    street_name: '',
    street_number: '',
    province: '',
    locality: '',
    postal_code: '',
    identifier: '',
    project: '',
    new_equipment_location: '',
    assigned_to: '',
    location_details: '',
    repair_type: '',
    repair_type_2: '',
    registration_date: '',
    latitude: 0,
    longitude: 0,
    additional_notes: '',
    other_repair_type_1: '',
    other_repair_type_2: '',
    theta: 0,
    phi: 0,
  };

  constructor(private openHotspot: OpenHotspotService) {
    console.log('OpenHotspotComponent → constructor() ejecutado');
  }

  ngOnInit() {
    console.log('OpenHotspotComponent → ngOnInit()');

    this.subscription = this.openHotspot.openModal$.subscribe((data: ModalData) => {
      console.log('openModal$ → Datos recibidos:', data);
      this.modalData = { ...data }; // Spread operator for immutability
      this.visible = true;
      console.log('Estado actualizado → visible =', this.visible);
    });

    // Listen for close events if the service provides them
    this.closeSubscription = this.openHotspot.closeModal$?.subscribe(() => {
      this.closeBar();
    });
  }

  ngOnDestroy() {
    console.log('OpenHotspotComponent → ngOnDestroy()');

    this.subscription?.unsubscribe();
    this.closeSubscription?.unsubscribe();
    console.log('Suscripciones canceladas correctamente');
  }

  closeBar() {
    console.log('closeBar() llamado — cerrando panel');
    this.visible = false;
    // Optionally notify the service that the modal was closed
    this.openHotspot.notifyModalClosed?.();
  }

  // Helper method to format date
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  // Helper method to format coordinates
  formatCoordinate(coord: number): string {
    return coord ? coord.toFixed(6) : 'N/A';
  }

  // Helper method to get full address
  getFullAddress(): string {
    const parts = [
      this.modalData.street_name,
      this.modalData.street_number,
      this.modalData.locality,
      this.modalData.province
    ].filter(part => part && part.trim());

    return parts.join(', ') || 'Dirección no disponible';
  }
}
