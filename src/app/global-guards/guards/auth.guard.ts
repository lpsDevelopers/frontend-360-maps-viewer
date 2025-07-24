import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import {AdminAuthService} from "../../features-admin/Services/auth/admin-auth.service";


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AdminAuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/user/login']);
      return false;
    }

    // Verificar rutas de admin
    if (route.url[0]?.path === 'admin' && !this.authService.isAdmin()) {
      this.router.navigate(['/user/dashboard']);
      return false;
    }

    // Verificar rutas de usuario
    if (route.url[0]?.path === 'user' && !this.authService.isUser()) {
      this.router.navigate(['/admin/dashboard']);
      return false;
    }

    return true;
  }
}
