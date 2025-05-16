import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from "rxjs";
import {AuthService} from "../../Services/auth/auth.service";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy{
  private authSubscription?: Subscription;
  constructor(private authService:  AuthService) { }

  ngOnInit(): void {
    this.authSubscription = this.authService.isAuthenticated$.subscribe(
      isAuthenticated => {
        if (!isAuthenticated) {}
      }
    );
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}
