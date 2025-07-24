import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from "rxjs";
import {AdminAuthService} from "../../Services/auth/admin-auth.service";

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private authSubscription?: Subscription;

  constructor(private authService:AdminAuthService) {}

  ngOnInit() {
    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if(isAuthenticated) {
        console.log('isAuthenticated');
      }
    })
  }
  CloseSession(){
    this.authService.logout();
  }
  ngOnDestroy() {
    if(this.authSubscription){
      this.authSubscription.unsubscribe();
    }
  }
}
