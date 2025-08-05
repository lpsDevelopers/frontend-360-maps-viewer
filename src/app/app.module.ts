import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from "@angular/forms";
import { LoginComponent } from "./features/Auth/login/login.component";
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { MainPageComponent } from './features/Pages/main-page/main-page.component';
import { MapComponent } from './features/Components/map/map.component';
import { UploadComponent } from './features/Components/Modal/upload/upload.component';
import { MainBarComponent } from './features/Components/bar/main-bar/main-bar.component';
import { HeaderBarComponent } from './features/Components/bar/header-bar/header-bar.component';
import { FooterBarComponent } from './features/Components/bar/footer-bar/footer-bar.component';
import { DashboardComponent } from './features/Pages/dashboard/dashboard.component';
import { UserInfoComponent } from './features/Components/bar/body-bar/user-info/user-info.component';
import { LocationsComponent } from './features/Components/bar/body-bar/locations/locations.component';
import { ActionsComponent } from './features/Components/bar/body-bar/actions/actions.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MapTestComponent } from "./features/Components/map-test/map-test.component";
import { VrComponent } from './features/Components/viewer/vr/vr.component';
import { HomeComponent } from './features/Components/viewer/home/home.component';
import { LoaderComponent } from "./features/Components/loader/loader.component";
import { CommonModule } from '@angular/common';
import { LoaderCubeComponent } from "./features/Components/loader-cube/loader-cube.component";
import { HotspotComponent } from "./features/Components/viewer/hotspot/hotspot.component";
import { HotspotTooltipComponent } from "./features/Components/viewer/hotspot-tooltip/hotspot-tooltip.component";
import { OpenHotspotComponent } from './features/Components/viewer/open-hotspot/open-hotspot.component';
import { BarComponent } from './features-admin/Component-utils/bar/bar.component';
import { AdminDashboardComponent } from './features-admin/Components/admin-dashboard/admin-dashboard.component';
import { AllHotspotsComponent } from './features-admin/Components/all-hotspots/all-hotspots.component';
import { AllUsersComponent } from './features-admin/Components/all-users/all-users.component';
import { AdminLayoutComponent } from './features-admin/Layout/admin-layout/admin-layout.component';
import {AdminLoginComponent} from "./features-admin/Auth/admin-login/admin-login.component";
import {AuthInterceptor} from "./global-guards/guards/auth.interceptor";
import {AllCompaniesComponent} from "./features-admin/Components/all-companies/all-companies.component";
import {AllPanoramasComponent} from "./features-admin/Components/all-panoramas/all-panoramas.component";
import {AllLocationsComponent} from "./features-admin/Components/all-locations/all-locations.component";
import { AllCompanyBucketsComponent } from "./features-admin/Components/all-company-buckets/all-company-buckets.component";
import {AdminLocationsComponent} from "./features-admin/Pages/admin-locations/admin-locations.component";
import {AdminCompaniesComponent} from "./features-admin/Pages/admin-companies/admin-companies.component";
import { AdminCompanyBucketsComponent } from "./features-admin/Pages/admin-company-buckets/admin-company-buckets.component";
import {AdminHotspotsComponent} from "./features-admin/Pages/admin-hotspots/admin-hotspots.component";
import {AdminPanoramasComponent} from "./features-admin/Pages/admin-panoramas/admin-panoramas.component";
import {AdminUsersComponent} from "./features-admin/Pages/admin-users/admin-users.component";
import {ModalPanelComponent} from "./features-admin/Component-utils/modal-panel/modal-panel.component";
import {ModalPanel2Component} from "./features-admin/Component-utils/modal-panel-2/modal-panel-2.component";
import {ImageUploaderComponent} from "./features-admin/Component-utils/image-uploader/image-uploader.component";
import {AdminUploaderComponent} from "./features-admin/Pages/admin-uploader/admin-uploader.component";
import {ModalPanel3Component} from "./features-admin/Component-utils/modal-panel-3/modal-panel-3.component";
import { CsvLocationsComponent } from './features/Components/csv-locations/csv-locations.component';
import { PanoramaLevelerComponent } from './features/Components/panorama-leveler/panorama-leveler/panorama-leveler.component';
import {GetHotspotComponent} from "./features/Components/viewer/get-hotspot/get-hotspot.component";
import {ViewHotspotComponent} from "./features/Components/viewer/view-hotspot/view-hotspot.component";
import {AppRoutingModule} from "./app-routing.module";



@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MainPageComponent,
    MapComponent,
    UploadComponent,
    MainBarComponent,
    HeaderBarComponent,
    FooterBarComponent,
    DashboardComponent,
    UserInfoComponent,
    LocationsComponent,
    ActionsComponent,
    MapComponent,
    MapTestComponent,
    VrComponent,
    HomeComponent,
    LoaderComponent,
    LoaderCubeComponent,
    HotspotComponent,
    HotspotTooltipComponent,
    OpenHotspotComponent,
    AdminLoginComponent,
    BarComponent,
    AdminDashboardComponent,
    AllHotspotsComponent,
    AllUsersComponent,
    AdminLayoutComponent,
    AllCompaniesComponent,
    AllPanoramasComponent,
    AllLocationsComponent,
    AllCompanyBucketsComponent,
    LocationsComponent,
    AdminLocationsComponent,
    AdminCompaniesComponent,
    AdminCompanyBucketsComponent,
    AdminHotspotsComponent,
    AdminPanoramasComponent,
    AdminUsersComponent,
    ModalPanelComponent,
    ModalPanel2Component,
    ImageUploaderComponent,
    AdminUploaderComponent,
    ModalPanel3Component,
    CsvLocationsComponent,
    PanoramaLevelerComponent,
    ViewHotspotComponent,
    GetHotspotComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CommonModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass:AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
