import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-actions',
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.scss']
})
export class ActionsComponent {
  @Input() isExpanded: boolean = true;
  @Output() logout = new EventEmitter<void>();

  onLogout() {
    this.logout.emit();
  }

  onUpload() {
    console.log('Upload clicked');
  }
}
