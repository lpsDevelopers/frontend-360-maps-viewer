import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import  { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {FormsModule} from "@angular/forms";
import {LoginComponent} from "./features/Auth/login/login.component";
import { AuthInterceptor } from "./guards/auth.interceptors";
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
import {MapTestComponent} from "./features/Components/map-test/map-test.component";
import { VrComponent } from './features/Components/viewer/vr/vr.component';
import { HomeComponent } from './features/Components/viewer/home/home.component';
import { LoaderComponent } from "./features/Components/loader/loader.component";
import { CommonModule } from '@angular/common';
import { LoaderCubeComponent } from "./features/Components/loader-cube/loader-cube.component";
import {HotspotComponent} from "./features/Components/viewer/hotspot/hotspot.component";
import {HotspotTooltipComponent} from "./features/Components/viewer/hotspot-tooltip/hotspot-tooltip.component";

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
    HotspotTooltipComponent
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
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
