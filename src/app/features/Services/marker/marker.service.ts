import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import * as L from 'leaflet';
import { Observable } from 'rxjs';
import { PopupService } from "../popup/popup.service";

export interface Panorama {
  id: string;
  location_id: string;
  filename: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  other_field_1: string;
  other_field_2: string;

  latitude: number;   // <-- nueva propiedad
  longitude: number;  // <-- nueva propiedad
}

@Injectable({
  providedIn: 'root'
})
export class MarkerService {

  capitals: string = '/assets/data/usa-capitals.geojson';


  constructor(
    private http: HttpClient,
    private popupService: PopupService
  ) {}

  static scaledRadius(val: number, maxVal: number): number {
    return 20 * (val / maxVal);
  }

  makeCapitalMarkers(map: L.Map): void {
    this.http.get(this.capitals).subscribe((res: any) => {
      for (const c of res.features) {
        const [lon, lat] = c.geometry.coordinates;
        const marker = L.marker([lat, lon]);
        marker.addTo(map);
      }
    });
  }
  makeCapitalCircleMarkers2(map: L.Map): void {
    this.http.get(this.capitals).subscribe((res: any) => {
      for (const c of res.features) {
        const lon = c.geometry.coordinates[0];
        const lat = c.geometry.coordinates[1];
        const circle = L.circleMarker([lat, lon]);

        circle.addTo(map);
      }
    });
  }

  makeCapitalCircleMarkers(map: L.Map): void {
    this.http.get(this.capitals).subscribe((res: any) => {
      const maxPop = Math.max(
        ...res.features.map((x: any) => x.properties.population)
      );

      for (const c of res.features) {
        const [lon, lat] = c.geometry.coordinates;
        const circle = L.circleMarker([lat, lon], {
          radius: MarkerService.scaledRadius(c.properties.population, maxPop)
        });

        circle.addTo(map);
      }
    });
  }


}
