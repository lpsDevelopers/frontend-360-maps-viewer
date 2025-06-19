// navigation-tracker.service.ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter, pairwise } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavigationTrackerService {
  private previousUrl: string = '';
  private currentUrl: string = '';

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      pairwise()
    ).subscribe(([prev, curr]) => {
      this.previousUrl = prev.urlAfterRedirects;
      this.currentUrl = curr.urlAfterRedirects;

      console.log('[NavigationTracker] Navegación detectada:');
      console.log('  Ruta anterior:', this.previousUrl);
      console.log('  Ruta actual:', this.currentUrl);
    });
  }

  getPreviousUrl(): string {
    return this.previousUrl;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }
}
