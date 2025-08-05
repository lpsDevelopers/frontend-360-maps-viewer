import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {AuthService} from "../../../features/Services/auth/auth.service";
import {AdminAuthService} from "../../../features-admin/Services/auth/admin-auth.service";


@Injectable({
  providedIn: 'root'
})
export class UserGuard implements CanActivate {
  constructor(
    private authService: AuthService,           // ← AuthService para usuarios
    private adminAuthService: AdminAuthService, // ← AdminAuthService para admins
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    console.log('[UserGuard] Verificando acceso usuario para:', state.url);

    // ✅ OPCIÓN 1: Verificar si es usuario normal autenticado
    const isUserAuthenticated = this.authService.isAuthenticated();

    // ✅ OPCIÓN 2: Verificar si es admin autenticado (puede acceder a rutas de usuario)
    const isAdminAuthenticated = this.adminAuthService.isAuthenticated() &&
      this.adminAuthService.isAdmin();

    console.log('[UserGuard] Estado:', {
      isUserAuthenticated,
      isAdminAuthenticated,
      userHasFullData: !!this.authService.fullUserValue,
      adminRole: this.adminAuthService.currentUserValue?.role
    });

    // ✅ Permitir acceso si es usuario autenticado O admin autenticado
    if (isUserAuthenticated || isAdminAuthenticated) {
      console.log('[UserGuard] Acceso permitido - Usuario o Admin autenticado');
      return true;
    }

    // ✅ Si no está autenticado en ningún sistema, redirigir a login de usuario
    console.log('[UserGuard] No autenticado en ningún sistema, redirigiendo a login');
    this.router.navigate(['/login']);
    return false;
  }
}
