import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import  { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import {FormsModule} from "@angular/forms";
import {LoginComponent} from "./features/Auth/login/login.component";
import { AuthInterceptor } from "./guards/auth.interceptors";
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { MainPageComponent } from './features/Pages/main-page/main-page.component';
import { MapComponent } from './features/Components/map/map.component';
import { UploadComponent } from './features/Components/Modal/upload/upload.component';
import { MainBarComponent } from './features/Components/bar/main-bar/main-bar.component';
import { HeaderBarComponent } from './features/Components/bar/header-bar/header-bar.component';
import { BodyBarComponent } from './features/Components/bar/body-bar/body-bar.component';
import { FooterBarComponent } from './features/Components/bar/footer-bar/footer-bar.component';
import { DashboardComponent } from './features/Pages/dashboard/dashboard.component';
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MainPageComponent,
    MapComponent,
    UploadComponent,
    MainBarComponent,
    HeaderBarComponent,
    BodyBarComponent,
    FooterBarComponent,
    DashboardComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
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
