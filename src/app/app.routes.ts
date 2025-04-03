import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './_guards/auth.guard';
import { AutoLoginComponent } from './components/auto-login/auto-login.component';

export const routes: Routes = [
    { path: '', component: AutoLoginComponent},
    { path: 'login', component: LoginComponent },
    { path: 'home', component: HomeComponent, canActivate: [authGuard]}
];
