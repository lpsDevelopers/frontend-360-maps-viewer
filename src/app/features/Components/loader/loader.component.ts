import { Component } from '@angular/core';
import {LoadingService} from "../../Services/loading/loading.service";

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent {
  constructor(public loadingService: LoadingService) {
    this.loadingService.loading$.subscribe(value => {
      console.log('Loader visibility:', value);
    });
  }


}
