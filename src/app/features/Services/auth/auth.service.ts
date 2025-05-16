import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { LoginResponse } from '../../Model/types';
import { EndpointService } from '../endpoint/endpoint.service';
import { User } from '../../Model/types';

interface DecodedToken {
  sub: string;
  given_name: string;
  family_name: string;
  role: string;
  Permission: string[];
  exp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private router: Router,
    private endpointService: EndpointService
  ) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
    this.isAuthenticatedSubject.next(this.isAuthenticated());

    window.addEventListener('storage', (event) => {
      if (event.key === 'logout-event') {
        this.handleLogout();
      }
    });
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserValue;
    const isValid = !!token && !!user && !this.isTokenExpired();
    this.isAuthenticatedSubject.next(isValid);
    return isValid;
  }

  login(response: any): void {
    const { token, id, firstName, lastName, role } = response.data;
    const decodedToken = jwtDecode<DecodedToken>(token);

    const user: User = {
      id: decodedToken.sub,  // ID del usuario desde el token
      email: response.data.email,  // Email del response

      role: decodedToken.role,  // Role extraído del token

      email_verified: response.data.email_verified || false,  // Verificación de email (según el backend)
    };

    this.setToken(token);
    this.setCurrentUser(user);
    this.isAuthenticatedSubject.next(true);
  }

  logout(): void {
    localStorage.setItem('logout-event', Date.now().toString());
    this.handleLogout();
  }

  private handleLogout(): void {
    this.removeToken();
    this.removeCurrentUser();
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private removeToken(): void {
    localStorage.removeItem('token');
  }

  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  private removeCurrentUser(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      return decodedToken.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

}
