import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from "rxjs";
import {AdminAuthService} from "../../Services/auth/admin-auth.service";

@Component({
  selector: 'app-admin-hotspots',
  templateUrl: './admin-hotspots.component.html',
  styleUrls: ['./admin-hotspots.component.scss']
})
export class AdminHotspotsComponent implements OnInit , OnDestroy {
  private authSubscription?: Subscription;

  constructor(private authService: AdminAuthService) {}

  ngOnInit() {
    this.authSubscription = this.authService.isAuthenticated$.subscribe(
      isAuthenticated => {
        if (!isAuthenticated) {

        }
      }
    );
  }

  cerrarSession() {
    this.authService.logout();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}
