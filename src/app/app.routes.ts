import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './_guards/auth.guard';
import { WebrtcTestComponent } from './webrtc-test/webrtc-test.component';


import { AutoLoginComponent } from './components/auto-login/auto-login.component';
import { FriendsComponent } from './components/friends/friends.component';
import { GroupsComponent } from './components/groups/groups.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'friends', component: FriendsComponent, canActivate: [authGuard]},
    { path: 'groups', component: GroupsComponent, canActivate: [authGuard]},
    { path: 'home', component: HomeComponent, canActivate: [authGuard] },
    { path: 'webrtc-test',component: WebrtcTestComponent, canActivate: [authGuard] },
    { path: '', component: AutoLoginComponent},
    { path: '**', redirectTo: '' },
];
