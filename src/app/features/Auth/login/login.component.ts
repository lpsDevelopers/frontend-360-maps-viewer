import { Component, OnInit } from '@angular/core';
import { EndpointService } from '../../Services/endpoint/endpoint.service';
import { AuthService } from '../../Services/auth/auth.service';
import { User, LoginResponse } from '../../Model/types';
import { jwtDecode } from 'jwt-decode';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {LoadingService} from "../../Services/loading/loading.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  message: string = '';
  isLoading: boolean = false;
  messageType: 'error' | 'success' | '' = '';
  loading = false;
  constructor(
    private endPointService: EndpointService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    public loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Redirigir si ya está autenticado

    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']); // Redirige al dashboard si ya está autenticado
    }
  }

  login() {
    if (this.isLoading) return; // Prevenir múltiples clicks

    if (!this.validateForm()) return;


    this.loadingService.show();
    this.startLogin();

    this.endPointService.login(this.email, this.password)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
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
    console.log('Respuesta completa del login:', response); // 👈 Este debería salir siempre
  
    try {
      if (!response.isSucces || !response.data || typeof response.data !== 'string') {
        throw new Error('Token no válido en la respuesta');
      }
  
      this.authService.login(response); // solo esto
  
      this.showSuccess('Inicio de sesión exitoso');
      this.router.navigate(['/dashboard']);
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
