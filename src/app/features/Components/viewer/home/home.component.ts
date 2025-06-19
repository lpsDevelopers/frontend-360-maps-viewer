import { Component, OnInit } from '@angular/core';
import {Panorama} from "../../../Model/types";
import {Router} from "@angular/router";
import {ApiService} from "../../../Services/viewer-360/api/api.service";
import {LoadingService} from "../../../Services/loading/loading.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  panoramas: Panorama[] = [];

  constructor(
    private router: Router,
    private apiService: ApiService,
    private loadingService: LoadingService,
  ) { }
  ngOnInit() {
    this.loadingService.show();
    this.checkCssSupport();
    this.apiService.getAllPanoramas().subscribe({
        next: (res) => {
          this.panoramas = res.data;
          console.log('Respuesta del servicio', res);
          this.loadingService.hide();
        },
      error: (err) => {
          console.error('Error al cargar panoramas', err);
        this.loadingService.hide();
      }
    });
  }
  onLaunchClick(id: number): void {
    console.log('Botón Launch clickeado para panorama con id:', id);
    this.router.navigate(['/vr', id]); // Navega programáticamente
  }

  checkCssSupport() {
    const isSupported = CSS.supports('height: 100svh');
    const elems = document.querySelectorAll('.dynamicHeight') as NodeListOf<HTMLElement>;
    elems.forEach((e) =>
      e.classList.add(isSupported ? 'supported' : 'not-supported')
    );
  }
}
