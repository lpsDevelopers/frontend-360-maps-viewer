import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  constructor(private http: HttpClient) {}

  getAddressFromCoords(lat: number, lng: number) {
    return this.http.get<{ address: string }>(`/api/maps/geocode?lat=${lat}&lng=${lng}`);
  }
}
