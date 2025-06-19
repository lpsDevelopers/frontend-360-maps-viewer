import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FullScreenService {
  isFullScreen = false;
  constructor() { }

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
    const elem = document.documentElement;
    if(elem.requestFullscreen) {
      elem.requestFullscreen();
    }
    if(document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
