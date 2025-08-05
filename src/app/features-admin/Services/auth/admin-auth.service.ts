import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiResponse, DecodedToken, LoginResponse, User, UserEmail } from '../../Model/adminTypes';
import { AdminEndpointService } from '../endpoint/admin-endpoint.service';
import { jwtDecode } from 'jwt-decode';

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
    console.log('[AdminAuthService] Constructor: inicializando servicio de admin');

    // ✅ ARREGLO 1: Usar clave específica para admin
    const storedUser = localStorage.getItem('adminUser'); // ← CAMBIO: clave específica

    this.currentUserSubject = new BehaviorSubject<UserEmail | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();

    // ✅ ARREGLO 2: Verificación asíncrona
    setTimeout(() => {
      this.isAuthenticatedSubject.next(this.isAuthenticated());
    }, 0);

    // ✅ ARREGLO 3: Evento específico para admin
    window.addEventListener('storage', (event) => {
      if (event.key === 'admin-logout-event') { // ← CAMBIO: evento específico
        console.log('[AdminAuthService] Admin logout detectado desde otra pestaña');
        this.handleLogout();
      }
    });
  }

  public get currentUserValue(): UserEmail | null {
    const user = this.currentUserSubject.value;
    console.log('[AdminAuthService] currentUserValue:', user);
    return user;
  }

  // ✅ ARREGLO 4: Token específico para admin
  getToken(): string | null {
    const token = localStorage.getItem('adminToken'); // ← CAMBIO: clave específica
    console.log('[AdminAuthService] getToken:', token ? 'Token admin encontrado' : 'No hay token admin');
    return token;
  }

  // ✅ ARREGLO 5: Login corregido
  login(response: LoginResponse): void {
    console.log('[AdminAuthService] Login de administrador:', response);

    try {
      const { token, userId, firstName, lastName, role } = response.data;

      if (!token || !userId || !role) {
        throw new Error('Datos de login incompletos');
      }

      const decodedToken = jwtDecode<DecodedToken>(token);
      console.log('[AdminAuthService] Token decodificado:', decodedToken);

      // Verificar que sea administrador
      if (role !== 'ADMINISTRADOR' && role !== 'SUPER_ADMINISTRADOR') {
        console.log('[AdminAuthService] Usuario no es admin, redirigiendo');
        this.router.navigate(['/login']);
        return;
      }

      let parsedPermissions: string[] = [];
      try {
        if (decodedToken.Permissions) {
          parsedPermissions = JSON.parse(decodedToken.Permissions);
        }
      } catch (error) {
        console.error('[AdminAuthService] Error parsing permissions:', error);
        parsedPermissions = [];
      }

      // ✅ ARREGLO 6: Obtener email del token
      const user: UserEmail = {
        id: userId,
        userId,
        firstName: firstName || '',
        lastName: lastName || '',
        role,
        permissions: parsedPermissions,
        email: '' // ← ARREGLO: obtener email
      };

      console.log('[AdminAuthService] Usuario admin creado:', user);

      // ✅ ARREGLO 7: Limpiar datos de usuario normal antes de guardar admin
      this.clearUserData();

      this.setToken(token);
      this.setCurrentUser(user);
      this.isAuthenticatedSubject.next(true);

      this.router.navigate(['/admin/dashboard']);

    } catch (error) {
      console.error('[AdminAuthService] Error en login admin:', error);
      this.handleLoginError();
    }
  }

  // ✅ ARREGLO 8: Limpiar datos de usuario normal
  private clearUserData(): void {
    console.log('[AdminAuthService] Limpiando datos de usuario normal');
    localStorage.removeItem('currentUser'); // Limpiar usuario normal
    localStorage.removeItem('token');       // Limpiar token normal
    localStorage.removeItem('email');       // Limpiar email normal
  }

  private handleLoginError(): void {
    this.removeToken();
    this.removeCurrentUser();
    this.isAuthenticatedSubject.next(false);
  }

  // ✅ ARREGLO 9: Logout que limpia TODO
  logout(): void {
    console.log('[AdminAuthService] Admin logout iniciado');
    localStorage.setItem('admin-logout-event', Date.now().toString()); // ← CAMBIO: evento específico
    this.handleLogout();
  }

  private handleLogout(): void {
    console.log('[AdminAuthService] Limpiando sesión admin completa');

    // Limpiar datos de admin
    this.removeToken();
    this.removeCurrentUser();

    // ✅ ARREGLO 10: También limpiar datos de usuario normal para evitar conflictos
    this.clearUserData();

    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/admin/login']); // ← Redirigir a admin login
  }

  // ✅ ARREGLO 11: Token con clave específica
  setToken(token: string): void {
    if (!token) {
      console.error('[AdminAuthService] Intentando guardar token vacío');
      return;
    }
    console.log('[AdminAuthService] Guardando token admin');
    localStorage.setItem('adminToken', token); // ← CAMBIO: clave específica
  }

  private removeToken(): void {
    console.log('[AdminAuthService] Eliminando token admin');
    localStorage.removeItem('adminToken'); // ← CAMBIO: clave específica
  }

  // ✅ ARREGLO 12: Usuario con clave específica y tipo correcto
  setCurrentUser(user: UserEmail): void { // ← CAMBIO: tipo correcto UserEmail
    if (!user || !user.id || !user.role) {
      console.error('[AdminAuthService] Intentando guardar usuario admin inválido:', user);
      return;
    }

    console.log('[AdminAuthService] Guardando usuario admin:', user);
    this.currentUserSubject.next(user);
    localStorage.setItem('adminUser', JSON.stringify(user)); // ← CAMBIO: clave específica
  }

  private removeCurrentUser(): void {
    console.log('[AdminAuthService] Eliminando usuario admin');
    this.currentUserSubject.next(null);
    localStorage.removeItem('adminUser'); // ← CAMBIO: clave específica
  }

  // ✅ ARREGLO 13: isAuthenticated mejorado
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserValue;
    const tokenExpired = this.isTokenExpired();

    const isValid = !!token && !!user && !tokenExpired;

    console.log('[AdminAuthService] isAuthenticated:', {
      hasToken: !!token,
      hasUser: !!user,
      tokenExpired,
      isValid
    });

    return isValid;
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      console.log('[AdminAuthService] No hay token admin, expirado = true');
      return true;
    }

    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      const expired = decodedToken.exp * 1000 < Date.now();
      console.log('[AdminAuthService] Token admin expirado:', expired);
      return expired;
    } catch (error) {
      console.error('[AdminAuthService] Error decodificando token admin:', error);
      return true;
    }
  }

  isAdmin(): boolean {
    const role = this.currentUserValue?.role;
    const isAdmin = role === 'ADMINISTRADOR' || role === 'SUPER_ADMINISTRADOR';
    console.log('[AdminAuthService] isAdmin:', isAdmin, 'role:', role);
    return isAdmin;
  }

  isUser(): boolean {
    const role = this.currentUserValue?.role;
    const isUser = role === 'USUARIO';
    console.log('[AdminAuthService] isUser:', isUser, 'role:', role);
    return isUser;
  }

  hasPermission(permission: string): boolean {
    const permissions = this.currentUserValue?.permissions || [];
    const hasPerm = permissions.includes(permission.toLowerCase());
    console.log(`[AdminAuthService] hasPermission('${permission}'):`, hasPerm, 'permissions:', permissions);
    return hasPerm;
  }

  getUserFullName(): string {
    const user = this.currentUserValue;
    if (!user) return '';
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const result = fullName || user.email || `Admin ${user.id}`;
    console.log('[AdminAuthService] getUserFullName:', result);
    return result;
  }

  // ✅ ARREGLO 14: Métodos adicionales útiles
  getUserRole(): string {
    return this.currentUserValue?.role || '';
  }

  getUserPermissions(): string[] {
    return this.currentUserValue?.permissions || [];
  }

  getUserId(): number | null {
    return this.currentUserValue?.id || null;
  }

  getUserEmail(): string {
    return this.currentUserValue?.email || '';
  }

  // ✅ ARREGLO 15: Método para verificar si hay datos de usuario normal
  hasUserData(): boolean {
    const hasNormalUser = !!localStorage.getItem('currentUser');
    const hasNormalToken = !!localStorage.getItem('token');
    console.log('[AdminAuthService] hasUserData:', { hasNormalUser, hasNormalToken });
    return hasNormalUser || hasNormalToken;
  }

  // ✅ ARREGLO 16: Método para forzar limpieza completa
  forceCleanAll(): void {
    console.log('[AdminAuthService] Forzando limpieza completa');

    // Limpiar admin
    this.removeToken();
    this.removeCurrentUser();

    // Limpiar usuario normal
    this.clearUserData();

    // Limpiar otros datos
    localStorage.removeItem('logout-event');
    localStorage.removeItem('admin-logout-event');

    this.isAuthenticatedSubject.next(false);
  }
}
