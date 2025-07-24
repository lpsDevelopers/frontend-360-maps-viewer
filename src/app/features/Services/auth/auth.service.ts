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
  given_name: string;
  family_name: string;
  role: number;
  Permission: string[];
  exp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<UserEmailToken | null>;
  public currentUser: Observable<UserEmailToken | null>;

  // Nuevo BehaviorSubject para el usuario completo
  private fullUserSubject = new BehaviorSubject<User | null>(null);
  public fullUser$ = this.fullUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly EMAIL_KEY = 'email';

  constructor(
    private router: Router,
    private endpointService: EndpointService
  ) {
    const storedUser = localStorage.getItem('currentUser');

    this.currentUserSubject = new BehaviorSubject<UserEmailToken | null>(
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
    this.isAuthenticatedSubject.next(isValid);
    return isValid;
  }

  login(response: any): void {
    const token = response.data;
    const decodedToken: any = jwtDecode(token);
    const user: UserEmailToken = {
      email: decodedToken.email,
    };
    this.setToken(token);
    this.setCurrentUser(user);
    this.isAuthenticatedSubject.next(true);
    // Carga el usuario completo desde la API y actualiza fullUserSubject
    this.loadFullUser();
  }

  loadFullUser(): void {
    const email = this.currentUserValue?.email;


    if (!email) {

      this.fullUserSubject.next(null);
      return;
    }

    this.endpointService.userLogin(email).pipe(
      map(response => response.data),
      catchError((error) => {
        this.fullUserSubject.next(null);
        return of(null);
      })
    ).subscribe(user => {
      this.fullUserSubject.next(user);
      console.log('loadFullUser: usuario completo recibido:', user);
    });
  }

  logout(): void {

    localStorage.setItem('logout-event', Date.now().toString());
    this.handleLogout();
  }

  private handleLogout(): void {

    this.removeToken();
    this.removeCurrentUser();
    this.fullUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  setEmail(email: string): void {

    localStorage.setItem(this.EMAIL_KEY, email);
  }

  getEmail(): string | null {
    const email = localStorage.getItem(this.EMAIL_KEY);

    return email;
  }

  setToken(token: string): void {

    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');

    return token;
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
    if (!token) {

      return true;
    }

    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      const expired = decodedToken.exp * 1000 < Date.now();

      return expired;
    } catch (error) {

      return true;
    }
  }
}
