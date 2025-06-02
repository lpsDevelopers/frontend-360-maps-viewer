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
  role: number;
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

  private readonly EMAIL_KEY = 'email';
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
    const token = response.data;
    const decodedToken: any = jwtDecode(token);

    const user: User = {
      id: parseInt(decodedToken.sub, 10),
      email: decodedToken.email,
      role: decodedToken.role === 'Admin' ? 1 : 0,
      email_verified: decodedToken.email_verified === 'True',
      password_hash: '',
      company_id: Number(decodedToken.company_id)  // Aquí debe tener 1, no 0
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
