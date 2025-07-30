import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {BehaviorSubject, Observable, throwError} from "rxjs";
import {ApiResponse, DecodedToken, LoginResponse, User, UserEmail} from "../../Model/adminTypes";
import {catchError, timeout} from "rxjs/operators";
import {Router} from "@angular/router";
import {AdminEndpointService} from "../endpoint/admin-endpoint.service";
import {jwtDecode} from "jwt-decode";

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {

  private currentUserSubject: BehaviorSubject<UserEmail | null>;
  public currentUser: Observable<UserEmail | null>;

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private router: Router,
    private endpointService: AdminEndpointService
  ) {
    console.log('[AuthService] Constructor: cargando usuario desde localStorage');
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<UserEmail | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
    this.isAuthenticatedSubject.next(this.isAuthenticated());

    window.addEventListener('storage', (event) => {
      if (event.key === 'logout-event') {
        console.log('[AuthService] Logout detectado desde otra pestaña');
        this.handleLogout();
      }
    });
  }

  // Getters
  public get currentUserValue(): UserEmail | null {
    console.log('[AuthService] currentUserValue:', this.currentUserSubject.value);
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    console.log('[AuthService] getToken:', token);
    return token;
  }

  // Login
  login(response: LoginResponse): void {
    const { token, userId, firstName, lastName, role } = response.data;
    const decodedToken = jwtDecode<DecodedToken>(token);
    console.log('[AuthService] login: token decodificado', decodedToken);

    let parsedPermissions: string[] = [];

    try {
      if (decodedToken.Permissions) {
        parsedPermissions = JSON.parse(decodedToken.Permissions);
      }
    } catch (error) {
      console.error('Error parsing permissions:', error);
      parsedPermissions = [];
    }

    const user: UserEmail = {
      id: userId,
      userId,
      firstName,
      lastName,
      role,
      permissions: parsedPermissions,
      email: ''
    };

    this.setToken(token);
    this.setCurrentUser(user); // Aquí lo guardas en localStorage
    this.isAuthenticatedSubject.next(true);

    if (this.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/user/dashboard']);
    }
  }


  // Logout
  logout(): void {
    console.log('[AuthService] logout: iniciando proceso de logout');
    localStorage.setItem('logout-event', Date.now().toString());
    this.handleLogout();
  }

  private handleLogout(): void {
    console.log('[AuthService] handleLogout: limpiando sesión');
    this.removeToken();
    this.removeCurrentUser();
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  // Manejo de token
  setToken(token: string): void {
    console.log('[AuthService] setToken:', token);
    localStorage.setItem('token', token);
  }

  private removeToken(): void {
    console.log('[AuthService] removeToken: eliminando token');
    localStorage.removeItem('token');
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      console.log('[AuthService] isTokenExpired: no hay token, expirado = true');
      return true;
    }

    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      const expired = decodedToken.exp * 1000 < Date.now();
      console.log('[AuthService] isTokenExpired:', expired);
      return expired;
    } catch (error) {
      console.log('[AuthService] isTokenExpired: error decodificando token, expirado = true', error);
      return true;
    }
  }

  // Manejo de usuario
  setCurrentUser(user: User): void {
    console.log('[AuthService] setCurrentUser:', user);
    this.currentUserSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  private removeCurrentUser(): void {
    console.log('[AuthService] removeCurrentUser: eliminando usuario actual');
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
  }

  // Verificación de autenticación y roles
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserValue;
    const isValid = !!token && !!user && !this.isTokenExpired();
    console.log('[AuthService] isAuthenticated:', isValid);
    this.isAuthenticatedSubject.next(isValid);
    return isValid;
  }


  isAdmin(): boolean {
    const role = this.currentUserValue?.role;
    const isAdmin = role === 'ADMINISTRADOR' || role === 'SUPER_ADMINISTRADOR';
    console.log('[AuthService] isAdmin:', isAdmin);
    return isAdmin;
  }
  isUser(): boolean {
    const isUser = this.currentUserValue?.role === 'USUARIO';
    console.log('[AuthService] isUser:', isUser);
    return isUser;
  }


  hasPermission(permission: string): boolean {
    const hasPerm = this.currentUserValue?.permissions.includes(permission.toLowerCase()) || false;
    console.log(`[AuthService] hasPermission('${permission}'):`, hasPerm);
    return hasPerm;
  }

  getUserFullName(): string {
    const user = this.currentUserValue;
    const fullName = user ? `${user.firstName} ${user.lastName}` : '';
    console.log('[AuthService] getUserFullName:', fullName);
    return fullName;
  }
}
