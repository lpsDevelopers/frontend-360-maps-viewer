import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.scss']
})
export class UserInfoComponent {
  @Input() isExpanded: boolean = true; // Recibe el estado de expansión como entrada
  @Output() toggle = new EventEmitter<void>(); // Emite un evento para alternar el estado
  @Input() email: string = ''; // Recibe el correo electrónico del componente padre
  @Output() logout = new EventEmitter<void>(); // Emite el evento cuando se hace clic en logout
  toggleSidebar() {
    this.toggle.emit();  // Emitir evento para que el componente padre cambie el estado
  }
}
