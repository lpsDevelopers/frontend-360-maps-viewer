import { Component } from '@angular/core';
import { EndpointService } from '../../services/endpoint/endpoint.service';
import { AuthService } from '../../services/auth/auth.service';
import { User, LoginResponse } from '../../model/types';
import { jwtDecode } from 'jwt-decode';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  message: string = '';
  isLoading: boolean = false;
  messageType: 'error' | 'success' | '' = '';

  constructor(
    private endPointService: EndpointService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Redirigir si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/filter']);
    }
  }

  login() {
    if (this.isLoading) return; // Prevenir múltiples clicks

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
      console.log('Login response:', response);

      if (!response.session || !response.session.access_token) {
        throw new Error('Token inválido en la respuesta');
      }

      const decodedToken: any = jwtDecode(response.session.access_token);
      console.log('Decoded token:', decodedToken);

      // Crear el objeto user usando los datos de la respuesta y el token decodificado
      const user: User = {
        id: response.session.user.id,
        email: this.email,
        role: response.session.user.role,
        email_verified: response.session.user.user_metadata.email_verified  ,
      };

      console.log('Mapped user:', user);

      // Guardar el token y el usuario
      this.authService.setToken(response.session.access_token);
      this.authService.setCurrentUser(user);

      this.showSuccess('Inicio de sesión exitoso');

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
