import { Injectable } from '@angular/core';
import {Subject} from "rxjs";
import {Hotspot} from "../../../Model/types";




@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private openModalSource = new Subject<Hotspot>();
  openModal$ = this.openModalSource.asObservable();

  openModal(data: Hotspot) {
    this.openModalSource.next(data);
  }
}
