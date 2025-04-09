import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './_guards/auth.guard';
import { AutoLoginComponent } from './components/auto-login/auto-login.component';
import { MyLoginComponent } from './components/my-login/my-login.component';

export const routes: Routes = [
    { path: '', component: MyLoginComponent},
    { path: 'a', component: AutoLoginComponent},
    { path: 'login', component: LoginComponent },
    { path: 'home', component: HomeComponent, canActivate: [authGuard]}
];
