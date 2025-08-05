import { Component } from '@angular/core';
import {finalize} from "rxjs/operators";
import {LoginResponse, User, UserEmail} from "../../Model/adminTypes";
import {AdminEndpointService} from "../../Services/endpoint/admin-endpoint.service";
import {AdminAuthService} from "../../Services/auth/admin-auth.service";
import {Router} from "@angular/router";
import {jwtDecode} from "jwt-decode";

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent {
  email: string = 'admin@ejemplo.com';
  password: string = '123456';
  message: string = '';
  isLoading: boolean = false;
  messageType: 'error' | 'success' | '' = '';

  constructor(
    private endPointService: AdminEndpointService,
    private authService: AdminAuthService,
    private router: Router
  ) {
    if (this.authService.isAuthenticated() && this.authService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  login() {
    if (this.isLoading) return;

    if (!this.validateForm()) return;

    this.startLogin();

    this.endPointService.login(this.email, this.password)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response: LoginResponse) => {
          if (!response.isSucces) {
            this.showError(response.message || 'Error en el inicio de sesión');
            return;
          }
          this.handleSuccessfulLogin(response);
        },
        error: (error) => {
          this.handleLoginError(error);
        }
      });
  }

  private validateForm(): boolean {
    this.messageType = '';
    this.message = '';

    if (!this.email && !this.password) {
      this.showError('Por favor, ingrese su email y contraseña');
      return false;
    }

    if (!this.email) {
      this.showError('Por favor, ingrese su email');
      return false;
    }

    if (!this.password) {
      this.showError('Por favor, ingrese su contraseña');
      return false;
    }

    if (!this.isValidEmail(this.email)) {
      this.showError('Por favor, ingrese un email válido');
      return false;
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  }

  private startLogin(): void {
    this.isLoading = true;
    this.message = '';
    this.messageType = '';
  }

  private handleSuccessfulLogin(response: LoginResponse): void {
    try {
      if (!response.data || typeof response.data !== 'string') {
        console.log('Data:', response.data);
        throw new Error('Token inválido en la respuesta');
      }

      const token = response.data;
      const decodedToken: any = jwtDecode(token);

      console.log('Token decodificado:', decodedToken);

      const userRole = decodedToken.role?.toLowerCase() || 'desconocido';
      const userPermissions = decodedToken.permissions?.toLowerCase() || 'desconocido';

      console.log('Role:', userRole );
      console.log('Permission:', userPermissions );
      // Mostrar mensaje con el rol del usuario
      this.showSuccess(`Inicio de sesión exitoso. Rol: ${userRole}`);
      this.showSuccess(`Inicio de sesión exitoso. Rol: ${userPermissions}`);

      let parsedPermissions: string[] = [];
      if (decodedToken.Permissions) {
        try {
          parsedPermissions = JSON.parse(decodedToken.Permissions);
        } catch (error) {
          console.error('Error parsing permissions:', error);
        }
      }
      const user: UserEmail = {
        id: decodedToken.sub,
        email: decodedToken.email,
        firstName: '',
        lastName: '',
        userId: decodedToken.sub,
        role: decodedToken.role,
        permissions: userPermissions
      };
      console.log('User:', user);
      this.authService.setToken(token);
      this.authService.setCurrentUser(user);

      if (userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMINISTRADOR') {
        console.log('Al dashboard');
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.router.navigate(['/admin/dashboard']);
      }

    } catch (error) {
      console.error('Error procesando login:', error);
      this.showError('Error procesando la respuesta del servidor');
    }
  }
  private handleLoginError(error: any): void {
    console.error('Error en login:', error);

    let errorMessage = 'Error de conexión. Por favor, intente nuevamente.';

    if (error.status === 401) {
      errorMessage = 'Email o contraseña incorrectos';
    } else if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor. Por favor, verifique su conexión.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.showError(errorMessage);
  }

  private showError(message: string): void {
    this.message = message;
    this.messageType = 'error';
  }

  private showSuccess(message: string): void {
    this.message = message;
    this.messageType = 'success';
  }
}
