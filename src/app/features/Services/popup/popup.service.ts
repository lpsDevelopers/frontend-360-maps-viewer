import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class PopupService {

  constructor() { }

  makeCapitalPopup(data: { address: string; name: string; thumbnail?: string }): string {
    return `
      <div style="text-align:center">
        <div><strong>Nombre:</strong> ${data.address}</div>

      </div>
    `;
  }
  addHoverBehavior(marker: L.CircleMarker, popupContent: string): void {
    marker.on('mouseover', () => {
      if (!marker.getPopup()) {
        marker.bindPopup(popupContent);
      }
      marker.openPopup();
    });

    marker.on('mouseout', () => {
      marker.closePopup();
    });
  }
}
