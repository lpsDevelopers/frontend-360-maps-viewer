import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../features/Services/auth/auth.service'; // Asegúrate de que este servicio está importado correctamente

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {


    if (this.isPublicRoute(request.url)) {
      return next.handle(request);
    }


    const token = this.authService.getToken();

    if (token) {

      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {

          this.authService.logout();
        } else if (error.status === 403) {
          // Si es 403, podemos manejarlo como "Acceso denegado"
          console.warn('Acceso denegado');
        }
        return throwError(() => error); // Propaga el error para que el componente lo maneje
      })
    );
  }

  // Verificar si la ruta es pública
  private isPublicRoute(url: string): boolean {
    const publicRoutes = [
      '/api/auth/signin',   // Ruta para el login
      '/api/auth/register', // Ruta para el registro
    ];
    return publicRoutes.some(route => url.includes(route)); // Si la URL contiene alguna de las rutas públicas, no se añade el token
  }
}
