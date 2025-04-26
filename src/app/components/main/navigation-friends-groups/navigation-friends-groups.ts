import { Component } from '@angular/core';
import {GroupFriendsSwitchComponent} from '../switch-group-friends/group-friends-switch.component';
import {MatMiniFabButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-top-left',
  imports: [
    GroupFriendsSwitchComponent,
    MatIcon,
  ],
  templateUrl: './navigation-friends-groups.html',
  styleUrl: './navigation-friends-groups.scss'
})
export class NavigationFriendsGroups {

}
