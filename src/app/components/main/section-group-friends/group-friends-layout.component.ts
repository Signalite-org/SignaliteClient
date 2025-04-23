import { Component } from '@angular/core';
import {CardFriendComponent} from '../card-friend/card-friend.component';
import {GroupFriendSearchComponent} from '../search-group-friend/group-friend-search.component';

@Component({
  selector: 'app-center-left',
  imports: [
    CardFriendComponent,
    GroupFriendSearchComponent
  ],
  templateUrl: './group-friends-layout.component.html',
  styleUrl: './group-friends-layout.component.css'
})
export class GroupFriendsLayoutComponent {

}
