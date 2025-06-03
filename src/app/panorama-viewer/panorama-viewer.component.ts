import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as pannellum from 'pannellum';
@Component({
  selector: 'app-panorama-viewer',
  templateUrl: './panorama-viewer.component.html',
  styleUrls: ['./panorama-viewer.component.scss']
})
export class PanoramaViewerComponent implements AfterViewInit  {
  @ViewChild('panoramaContainer', { static: true }) panoramaContainer!: ElementRef;

  ngAfterViewInit(): void {
    pannellum.viewer(this.panoramaContainer.nativeElement, {
      type: 'equirectangular',
      panorama: 'URL_DE_TU_IMAGEN_360',
      autoLoad: true,
      compass: true
    });
  }
}
