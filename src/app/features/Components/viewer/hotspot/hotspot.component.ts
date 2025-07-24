import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {  ModalService } from "../../../Services/viewer-360/modal/modal.service";
import { HotspotSelected, Hotspot} from "../../../Model/types";
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

  modalData: Hotspot = {
    // Campos directos (mapeo 1:1)
    id: 0,
    pitch: 0,
    yaw: 0,
    theta: 0,
    phi: 0,
    panoramasId: 0,

    // Campos renombrados
    codigoPosteAntiguo:  '',       // label -> codigoPosteAntiguo
    nombreVia: '',                // title -> nombreVia
    trabajoARealizar: '',          // text -> trabajoARealizar
    observacion1: '',       // description -> observacion1
    filePath1: '',             // filePath -> filePath1
    tipoPoste: 'poste',     // typeHotspot -> tipoPoste
    condicion:  'Activo' , // state -> condicion

    // Campos transformados
    viewCapturePath: 0,

    // Nuevos campos con valores por defecto
    item: 0,
    criticidad: '',
    red: '',
    tipoRed: '',
    alturaSoporte: 8.5,
    alturaVano: 6.0,
    codigoDistrito: '',
    tipoVia: 'Calle',
    numero: 'S/N',
    manzana: '',
    lote: '',
    coordenadas: '',
    latitudS: '',
    longitudW: '',
    urbanizacion: '',
    posteSiguiente: '',
    observacion2: '',
    observacion3: '',
    filePath2: '',
    filePath3: '',


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
