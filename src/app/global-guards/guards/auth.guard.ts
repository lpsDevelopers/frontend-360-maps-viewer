import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {AuthService} from "../../features/Services/auth/auth.service";
import {AdminAuthService} from "../../features-admin/Services/auth/admin-auth.service";

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    console.log('[AuthGuard] Verificando acceso para:', state.url);

    const firstSegment = route.url[0]?.path;

    if (firstSegment === 'admin') {
      if (!this.adminAuthService.isAuthenticated() || !this.adminAuthService.isAdmin()) {
        console.log('[AuthGuard] Acceso admin denegado');
        this.router.navigate(['/admin/login']);
        return false;
      }
      return true;
    }

    const isUserAuth = this.authService.isAuthenticated();
    const isAdminAuth = this.adminAuthService.isAuthenticated() && this.adminAuthService.isAdmin();

    if (isUserAuth || isAdminAuth) {
      console.log('[AuthGuard] Acceso usuario permitido');
      return true;
    }

    console.log('[AuthGuard] Sin autenticación, redirigiendo');
    this.router.navigate(['/login']);
    return false;
  }
}
