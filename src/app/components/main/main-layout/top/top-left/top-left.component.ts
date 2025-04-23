import { Component } from '@angular/core';
import {GroupFriendsSwitchComponent} from '../../../switch-group-friends/group-friends-switch.component';
import {MatMiniFabButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-top-left',
  imports: [
    GroupFriendsSwitchComponent,
    MatIcon,
  ],
  templateUrl: './top-left.component.html',
  styleUrl: './top-left.component.scss'
})
export class TopLeftComponent {

}
