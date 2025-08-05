import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {AdminAuthService} from "../../features-admin/Services/auth/admin-auth.service";

@Injectable()

export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AdminAuthService ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if (this.isPublicRoute(request.url)) {
      return next.handle(request);
    }

    const token = this.authService.getToken();

    if (token) {
      const isJsonRequest = request.headers.get('Content-Type') === 'application/json'
        || request.body instanceof Object && !(request.body instanceof FormData);

      let headersConfig: { [name: string]: string | string[] } = {
        Authorization: `Bearer ${token}`
      };

      if (isJsonRequest) {
        headersConfig['Content-Type'] = 'application/json';
      }

      request = request.clone({
        setHeaders: headersConfig
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authService.logout();
        } else if (error.status === 403) {
          console.warn('Acceso denegado');
        }
        return throwError(() => error);
      })
    );
  }

  private isPublicRoute(url: string): boolean {
    const publicRoutes = [
      '/api/User/Login',
      '/api/User/Register',
    ];
    return publicRoutes.some(route => url.includes(route));
  }
}
