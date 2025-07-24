import { Component, OnInit, HostListener } from '@angular/core';
import { MenuItem } from "../../Model/adminTypes";
import { AdminAuthService } from "../../Services/auth/admin-auth.service";
import { Router } from '@angular/router';

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.scss']
})
export class BarComponent implements OnInit {
  menuItems: MenuItem[] = [];
  isAdmin: boolean = false;
  isCollapsed: boolean = false;
  isMobile: boolean = false;
  isMobileOpen: boolean = false;
  isModalVisible = false;
  private adminMenuItems: MenuItem[] = [
    {
      path: '/admin/users',
      icon: 'fas fa-users',
      label: 'Ver Usuarios',
      permission: 'UserList'
    },
    {
      path: '/admin/hotspots',
      icon: 'fas fa-map-marker-alt',
      label: 'Ver Hotspots',
      permission: 'PostesList'
    },
    {
      path: '/admin/panoramas',
      icon: 'fas fa-map-marker-alt',
      label: 'Ver Panoramas',
      permission: 'PanoramasList'
    },
    {
      path: '/admin/locations',
      icon: 'fas fa-map-marker-alt',
      label: 'Ver Locations',
      permission: 'LocationsList'
    },
    {
      path: '/admin/companies',
      icon: 'fas fa-map-marker-alt',
      label: 'Ver Companies',
      permission: 'CompaniesList'
    }


  ];

  constructor(
    private authService: AdminAuthService,
    private router: Router
  ) {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    if (this.isAdmin) {
      this.menuItems = this.adminMenuItems;
    }

    // Auto-colapsar en pantallas pequeñas
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
    if (this.isMobile) {
      this.isCollapsed = true;
      this.isMobileOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Cerrar sidebar en móvil cuando se hace clic fuera
    if (this.isMobile && this.isMobileOpen) {
      const target = event.target as HTMLElement;
      const sidebar = document.querySelector('.sidebar-container');
      if (sidebar && !sidebar.contains(target)) {
        this.isMobileOpen = false;
      }
    }
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth <= 1024;
  }

  onOpenModal(): void {
    this.isModalVisible = true;
  }
  toggleSidebar() {
    if (this.isMobile) {
      this.isMobileOpen = !this.isMobileOpen;
    } else {
      this.isCollapsed = !this.isCollapsed;
    }
  }

  hasPermission(permission?: string ): boolean {

    console.log('hasPermission called with:', permission);
    if (!permission) return true;
    return this.authService.hasPermission(permission);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Método para obtener las clases CSS del contenedor
  getSidebarClasses(): string {
    let classes = 'sidebar-container';
    if (this.isCollapsed) classes += ' collapsed';
    if (this.isMobile && this.isMobileOpen) classes += ' mobile-open';
    return classes;
  }

  // Método para cerrar el sidebar en móvil después de navegar
  onNavigate() {
    if (this.isMobile) {
      this.isMobileOpen = false;
    }
  }


}

