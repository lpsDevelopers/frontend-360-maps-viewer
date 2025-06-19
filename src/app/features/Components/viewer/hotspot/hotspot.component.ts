import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ModalData, ModalService } from "../../../Services/viewer-360/modal/modal.service";
interface NotificationState {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

@Component({
  selector: 'app-hotspot',
  templateUrl: './hotspot.component.html',
  styleUrls: ['./hotspot.component.scss']
})
export class HotspotComponent implements OnInit, OnDestroy {
  visible = false;
  isLoading = false;
  notification: NotificationState = { show: false, type: 'success', message: '' };
  saveSuccess = false;
  private notificationTimeout?: number;

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
  public hideNotification(): void {
    this.notification.show = false;
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = undefined;
    }
  }
  private subscription!: Subscription;

  // Aquí guardamos el archivo seleccionado para usarlo luego si quieres
  selectedImageFile?: File;

  constructor(private modalService: ModalService) {}

  ngOnInit() {
    this.subscription = this.modalService.openModal$.subscribe(data => {
      this.modalData = { ...data }; // clonamos para no mutar directamente
      this.visible = true;
    });
  }

  // Maneja el input file y guarda el archivo seleccionado
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImageFile = input.files[0];
      console.log('Imagen seleccionada:', this.selectedImageFile);

      // Si quieres mostrar preview, puedes usar FileReader aquí
      // Ejemplo:
      // const reader = new FileReader();
      // reader.onload = (e: any) => {
      //   this.imagePreviewUrl = e.target.result; // Puedes mostrarlo en el template
      // };
      // reader.readAsDataURL(this.selectedImageFile);
    }
  }
  save() {
    console.log('Datos a guardar:', this.modalData);

    if (this.selectedImageFile) {
      console.log('Subiendo imagen:', this.selectedImageFile);
      // Aquí implementa la lógica para subir la imagen o guardarla
    }

    // Mostrar notificación de éxito
    this.notification = {
      show: true,
      type: 'success',
      message: 'Guardado exitosamente!'
    };

    // Ocultar la notificación después de 2.5 segundos
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = window.setTimeout(() => {
      this.hideNotification();
      this.close();
    }, 1000);
  }

  close() {
    this.visible = false;
    this.selectedImageFile = undefined; // limpia la selección al cerrar modal
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


}
