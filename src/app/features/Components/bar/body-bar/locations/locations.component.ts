import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { EndpointService } from '../../../../Services/endpoint/endpoint.service';
import { Locations } from '../../../../Model/types'; // Asegúrate que es singular, no 'Locations'
import { Router } from '@angular/router';

@Component({
  selector: 'app-locations',
  templateUrl: './locations.component.html',
  styleUrls: ['./locations.component.scss']
})
export class LocationsComponent implements OnInit {
  @Input() isExpanded: boolean = true;
  @Output() toggle = new EventEmitter<void>();

  locations: Locations[] = [];
  names: string = '';

  constructor(private endpointService: EndpointService, private router: Router) {}

  ngOnInit(): void {
    console.log("Iniciando carga de ubicaciones...");
    // Aquí suscribimos y obtenemos las ubicaciones
    this.endpointService.getUserLocations().subscribe({
      next: (res) => {
        console.log("Ubicaciones obtenidas:", res);  // Log para ver qué datos recibimos
        this.locations = res;
      },
      error: (err) => {
        console.error('Error al obtener las ubicaciones:', err);  // Log para capturar errores de la API
      }
    });
  }

  onLocationClick(locationId: string): void {
    console.log(`Se ha hecho clic en la ubicación con ID: ${locationId}`);  // Verificación de que el click se captura correctamente
    localStorage.setItem('selectedLocationId', locationId);
    console.log("ID de ubicación almacenado en localStorage:", locationId);  // Verificación de que el ID se guarda correctamente

    // Aquí navegamos a la ruta del mapa con el ID
    this.router.navigate(['/map', locationId]).then(success => {
      console.log("Navegación exitosa a /map", success);  // Verificamos si la navegación fue exitosa
    }).catch(error => {
      console.error("Error en la navegación:", error);  // Log de error si la navegación falla
    });
  }
}
