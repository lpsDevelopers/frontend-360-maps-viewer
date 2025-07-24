import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Componentes
import { LoginComponent } from './features/Auth/login/login.component';
import { DashboardComponent } from './features/Pages/dashboard/dashboard.component';
import { MapComponent } from './features/Components/map/map.component';

import {HomeComponent} from "./features/Components/viewer/home/home.component";
import {VrComponent} from "./features/Components/viewer/vr/vr.component";
import {AdminLoginComponent} from "./features-admin/Auth/admin-login/admin-login.component";
import {AdminLayoutComponent} from "./features-admin/Layout/admin-layout/admin-layout.component";
import {AdminDashboardComponent} from "./features-admin/Components/admin-dashboard/admin-dashboard.component";
import {AllUsersComponent} from "./features-admin/Components/all-users/all-users.component";

import {AuthGuard} from "./global-guards/guards";

import {AdminUsersComponent} from "./features-admin/Pages/admin-users/admin-users.component";
import {AdminHotspotsComponent} from "./features-admin/Pages/admin-hotspots/admin-hotspots.component";
import {AdminPanoramasComponent} from "./features-admin/Pages/admin-panoramas/admin-panoramas.component";
import {AdminLocationsComponent} from "./features-admin/Pages/admin-locations/admin-locations.component";
import {AdminCompaniesComponent} from "./features-admin/Pages/admin-companies/admin-companies.component";
import {ImageUploaderComponent} from "./features-admin/Component-utils/image-uploader/image-uploader.component";
import {AdminUploaderComponent} from "./features-admin/Pages/admin-uploader/admin-uploader.component";


const routes: Routes = [
  { path: '', redirectTo: '/user/login', pathMatch: 'full' },

  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'user/login', component: LoginComponent },

  { path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminUsersComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'hotspots', component: AdminHotspotsComponent },
      { path: 'panoramas', component: AdminPanoramasComponent },
      { path: 'locations', component: AdminLocationsComponent },
      { path: 'companies', component: AdminCompaniesComponent },
      { path: 'image-uploader', component: AdminUploaderComponent }
    ]
  },
  { path: 'user',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: 'users', pathMatch: 'full' }
    ]
  },

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
  { path: 'admin/login', component: AdminLoginComponent },



];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
