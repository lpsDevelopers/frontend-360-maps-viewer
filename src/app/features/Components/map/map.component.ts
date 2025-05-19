import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EndpointService } from '../../Services/endpoint/endpoint.service'; // Asegúrate de importar tu servicio

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  locationId: string | null = null;
  locationDetails: any;  // Cambia este tipo según el tipo de datos que estás esperando de la API

  constructor(
    private route: ActivatedRoute,
    private endpointService: EndpointService // Suponiendo que tienes un servicio para obtener los datos
  ) { }

  ngOnInit(): void {
    // Obtener el 'id' de la URL al iniciar el componente
    this.route.paramMap.subscribe(params => {
      this.locationId = params.get('id');
      if (this.locationId) {
        console.log(`La ubicación seleccionada tiene el id: ${this.locationId}`);

        // Llamar a tu servicio para obtener los detalles de la ubicación
        this.endpointService.getLocationDetails(this.locationId).subscribe(
          data => {
            this.locationDetails = data;
            console.log('Detalles de la ubicación:', this.locationDetails);
          },
          error => {
            console.error('Error al obtener los detalles de la ubicación', error);
          }
        );
      }
    });
  }
}
