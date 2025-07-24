// guards/user.guard.ts
import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';
import {AuthService} from "../../../features/Services/auth/auth.service";
import {AdminAuthService} from "../../../features-admin/Services/auth/admin-auth.service";


@Injectable({
  providedIn: 'root'
})
export class UserGuard implements CanActivate {
  constructor(
    private authService: AdminAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Verificar si el usuario tiene rol de usuario
    if (!this.authService.isUser()) {
      // Si es admin, redirigir al dashboard de admin
      if (this.authService.isAdmin()) {
        this.router.navigate(['/admin/dashboard']);
      } else {
        // Si no tiene ningún rol válido, redirigir al login
        this.router.navigate(['/login']);
      }
      return false;
    }

    // Verificar permisos específicos si la ruta los requiere
    const requiredPermission = route.data['permission'];
    if (requiredPermission && !this.authService.hasPermission(requiredPermission)) {
      this.router.navigate(['/user/dashboard']); // O a una página de acceso denegado
      return false;
    }

    return true;
  }
}
