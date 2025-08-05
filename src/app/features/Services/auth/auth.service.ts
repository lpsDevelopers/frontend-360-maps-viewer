import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { ApiResponse, UserEmailToken } from '../../Model/types';
import { EndpointService } from '../endpoint/endpoint.service';
import { User } from '../../Model/types';
import { map, catchError } from 'rxjs/operators';

interface DecodedToken {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  role: number | string;
  Permission: string[];
  exp: number;
  company_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<UserEmailToken | null>;
  public currentUser: Observable<UserEmailToken | null>;

  private fullUserSubject = new BehaviorSubject<User | null>(null);
  public fullUser$ = this.fullUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly EMAIL_KEY = 'email';

  constructor(
    private router: Router,
    private endpointService: EndpointService
  ) {
    console.log('[AuthService] Constructor: inicializando servicio de usuarios');

    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<UserEmailToken | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();

    // Verificar autenticación inicial
    setTimeout(() => {
      this.isAuthenticatedSubject.next(this.isAuthenticated());
    }, 0);

    window.addEventListener('storage', (event) => {
      if (event.key === 'logout-event') {
        console.log('[AuthService] Logout detectado desde otra pestaña');
        this.handleLogout();
      }
    });
  }

  public get currentUserValue(): UserEmailToken | null {
    return this.currentUserSubject.value;
  }

  public get fullUserValue(): User | null {
    return this.fullUserSubject.value;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserValue;
    const isValid = !!token && !!user && !this.isTokenExpired();
    console.log('[AuthService] isAuthenticated:', isValid);
    return isValid;
  }

  // ✅ CORREGIDO: Login que maneja SOLO usuarios normales
  login(response: any): void {
    console.log('[AuthService] Login de usuario normal:', response);

    const token = response.data;
    const decodedToken: DecodedToken = jwtDecode(token);

    console.log('[AuthService] Token decodificado:', decodedToken);

    // Verificar que sea un usuario normal (no admin)
    const roleNum = typeof decodedToken.role === 'number' ? decodedToken.role : parseInt(decodedToken.role);
    if (roleNum === 1 || roleNum === 2) { // Si es admin
      console.log('[AuthService] Usuario es admin, redirigiendo a admin login');
      this.router.navigate(['/admin/login']);
      return;
    }

    const user: UserEmailToken = {
      email: decodedToken.email || decodedToken.sub,
    };

    this.setToken(token);
    this.setCurrentUser(user);
    this.isAuthenticatedSubject.next(true);

    // Cargar usuario completo
    this.loadFullUser();

    // Redirigir a dashboard de usuario
    this.router.navigate(['/dashboard']);
  }

  loadFullUser(): void {
    const email = this.currentUserValue?.email;
    console.log('[AuthService] loadFullUser para email:', email);

    if (!email) {
      console.log('[AuthService] No hay email, no se puede cargar usuario completo');
      this.fullUserSubject.next(null);
      return;
    }

    this.endpointService.userLogin(email).pipe(
      map(response => response.data),
      catchError((error) => {
        console.error('[AuthService] Error cargando usuario completo:', error);
        this.fullUserSubject.next(null);
        return of(null);
      })
    ).subscribe(user => {
      console.log('[AuthService] Usuario completo recibido:', user);
      this.fullUserSubject.next(user);
    });
  }

  logout(): void {
    console.log('[AuthService] Logout iniciado');
    localStorage.setItem('logout-event', Date.now().toString());
    this.handleLogout();
  }

  private handleLogout(): void {
    console.log('[AuthService] Limpiando sesión');
    this.removeToken();
    this.removeCurrentUser();
    this.fullUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  // Métodos de token y usuario (sin cambios)
  setEmail(email: string): void {
    localStorage.setItem(this.EMAIL_KEY, email);
  }

  getEmail(): string | null {
    return localStorage.getItem(this.EMAIL_KEY);
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

  setCurrentUser(user: UserEmailToken): void {
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
      const expired = decodedToken.exp * 1000 < Date.now();
      return expired;
    } catch (error) {
      console.error('[AuthService] Error decodificando token:', error);
      return true;
    }
  }
}
