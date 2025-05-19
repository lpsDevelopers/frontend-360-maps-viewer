import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Componentes
import { LoginComponent } from './features/Auth/login/login.component';
import { DashboardComponent } from './features/Pages/dashboard/dashboard.component';
import { MapComponent } from './features/Components/map/map.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Redirige al login si la ruta está vacía
  { path: 'login', component: LoginComponent },  // Ruta de login
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],  // Aquí se protege la ruta con el guard
  },
  // Si intentan ir a una ruta que no existe, se redirige al login
  { path: '**', redirectTo: '/login' },
  { path: 'map/:id', component: MapComponent },  // Aquí es donde estamos configurando la ruta
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })], // Aquí se agrega 'onSameUrlNavigation: 'reload''
  exports: [RouterModule],
})
export class AppRoutingModule {}
