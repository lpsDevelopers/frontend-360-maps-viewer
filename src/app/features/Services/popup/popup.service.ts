import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PopupService {

  constructor() { }

  makeCapitalPopup(data: { name: string; state: string; population: string; thumbnail?: string }): string {
    return `
      <div style="text-align:center">
        ${data.thumbnail ? `<img src="${data.thumbnail}" alt="Vista previa" style="width:100px; height:auto; margin-bottom:8px;" />` : ''}
        <div><strong>Nombre:</strong> ${data.name}</div>
        <div><strong>Enlace:</strong> <a href="${data.state}" target="_blank">Ver panorama</a></div>
        <div><strong>Población:</strong> ${data.population}</div>
      </div>
    `;
  }
}
