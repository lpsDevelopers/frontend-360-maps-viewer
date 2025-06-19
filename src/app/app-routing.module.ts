import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Componentes
import { LoginComponent } from './features/Auth/login/login.component';
import { DashboardComponent } from './features/Pages/dashboard/dashboard.component';
import { MapComponent } from './features/Components/map/map.component';
import { AuthGuard } from './guards/auth.guard';
import {HomeComponent} from "./features/Components/viewer/home/home.component";
import {VrComponent} from "./features/Components/viewer/vr/vr.component";


const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard], },
  { path: 'map/:id', component:  DashboardComponent },
  { path: 'map-test/:id', component:  DashboardComponent },
  { path: 'viewer', component: HomeComponent },
  { path: 'vr/:id',
    component: VrComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/login' },


];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
