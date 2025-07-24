import { Component } from '@angular/core';
import {Subscription} from "rxjs";
import {AdminAuthService} from "../../Services/auth/admin-auth.service";

@Component({
  selector: 'app-admin-uploader',
  templateUrl: './admin-uploader.component.html',
  styleUrls: ['./admin-uploader.component.scss']
})
export class AdminUploaderComponent {
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
