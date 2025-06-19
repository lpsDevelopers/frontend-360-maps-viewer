import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-hotspot-tooltip',
  templateUrl: './hotspot-tooltip.component.html',
  styleUrls: ['./hotspot-tooltip.component.scss']
})
export class HotspotTooltipComponent {
  @Input() label: string = '';
  @Input() x: number = 0;
  @Input() y: number = 0;
}
