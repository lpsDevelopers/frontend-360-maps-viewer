import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import {AuthService} from "../../../features/Services/auth/auth.service";
import {AdminAuthService} from "../../../features-admin/Services/auth/admin-auth.service";

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AdminAuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/user/dashboard']);
      return false;
    }
    return true;
  }
}


