import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PopupService {

  constructor() { }

  makeCapitalPopup(data: { name: string; thumbnail?: string }): string {
    return `
    <div style="text-align:center">
      ${data.thumbnail ? `<img src="${data.thumbnail}" alt="Vista previa" style="width:100px; height:auto; margin-bottom:8px;" />` : ''}
      <div><strong>Nombre:</strong> ${data.name}</div>
      <div><em>Haz clic para ver en 360°</em></div>
    </div>
  `;
  }
}
