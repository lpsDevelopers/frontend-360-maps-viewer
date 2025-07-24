import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from '../viewer-360/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class HighlightService {
  private highlighted = new BehaviorSubject<Set<number>>(new Set());
  highlighted$ = this.highlighted.asObservable();

  constructor(private apiService: ApiService) {
    this.loadPredefinedIds();
  }

  private async loadPredefinedIds() {
    try {
      const response = await firstValueFrom(this.apiService.getPanoramaHasHotspots());

      const ids = response.data.map((p: any) => p.id);
      this.highlighted.next(new Set(ids));
      console.log('IDs cargados desde API:', ids);
    } catch (error) {
      console.error('Error cargando IDs desde API', error);
    }
  }

  addPanorama(id: number) {
    const current = new Set(this.highlighted.value);
    current.add(id);
    this.highlighted.next(current);
    console.log('Id Persistido', id);
  }

  clear() {
    this.highlighted.next(new Set());
  }

  getCurrent(): Set<number> {
    return this.highlighted.value;
  }
}
