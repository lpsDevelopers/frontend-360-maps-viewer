import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {AdminAuthService} from "../../../features-admin/Services/auth/admin-auth.service";

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private adminAuthService: AdminAuthService, // ← Solo AdminAuthService
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    console.log('[AdminGuard] Verificando acceso admin para:', state.url);

    // Verificar autenticación de admin
    if (!this.adminAuthService.isAuthenticated()) {
      console.log('[AdminGuard] Admin no autenticado, redirigiendo a admin login');
      this.router.navigate(['/admin/login']);
      return false;
    }

    // Verificar que sea admin
    if (!this.adminAuthService.isAdmin()) {
      console.log('[AdminGuard] No es admin, acceso denegado');
      this.router.navigate(['/admin/login']);
      return false;
    }

    console.log('[AdminGuard] Admin autenticado, acceso permitido');
    return true;
  }
}
