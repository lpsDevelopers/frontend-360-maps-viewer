import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import  { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import {FormsModule} from "@angular/forms";
import {LoginComponent} from "./features/Auth/login/login.component";
import { AuthInterceptor } from "./guards/auth.interceptors";
import { HTTP_INTERCEPTORS } from "@angular/common/http";

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent
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
