import {Component, OnInit} from '@angular/core';
import {AuthService} from "../../../Services/auth/auth.service";

@Component({
  selector: 'app-main-bar',
  templateUrl: './main-bar.component.html',
  styleUrls: ['./main-bar.component.scss']
})
export class MainBarComponent implements OnInit {
  isExpanded = true;
  email = '';
  constructor(private authService: AuthService) {
  }
  ngOnInit(): void {
    const saved = localStorage.getItem('sidebarExpanded');
    const storedEmail = this.authService.getEmail();
    if (storedEmail) {
      this.email = storedEmail;
    }
    this.isExpanded = saved === null ? true : JSON.parse(saved);
  }

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
    localStorage.setItem('sidebarExpanded', JSON.stringify(this.isExpanded));
  }

  handleMenuOptions(item: string) {
    console.log(`Opciones para: ${item}`);
    // Implementa la lógica necesaria
  }

  handleSearch(event: any) {
    console.log(`Buscando: ${event.target.value}`);
    // Implementa la lógica de búsqueda
  }

  handleUpload() {
    console.log('Upload clicked');
    // Implementa la lógica de subida
  }

  handleLogout() {
    console.log('Logout clicked');
    this.authService.logout();  // Llama al método del servicio
  }
}
