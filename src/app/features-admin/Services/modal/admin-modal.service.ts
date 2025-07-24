import { Injectable } from '@angular/core';

interface SavedFilterConfiguration {
  id: string;
  name: string;
  filters: any[]; // Tipo específico según tus necesidades
  createdAt?: Date;
}
@Injectable({
  providedIn: 'root'
})
export class AdminModalService {

  constructor() { }
}
