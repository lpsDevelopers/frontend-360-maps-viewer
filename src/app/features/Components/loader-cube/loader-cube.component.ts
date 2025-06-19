import { Component } from '@angular/core';
import { VrThreeService } from '../../Services/viewer-360/vrThree/vr-three.service';

@Component({
  selector: 'app-loader-cube',
  templateUrl: './loader-cube.component.html',
  styleUrls: ['./loader-cube.component.scss']
})
export class LoaderCubeComponent {
  constructor(public vrThreeService: VrThreeService) {
    console.log('LoaderCubeComponent iniciado');
  }
}
