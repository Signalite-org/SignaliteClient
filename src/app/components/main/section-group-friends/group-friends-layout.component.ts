import {Component, signal, WritableSignal} from '@angular/core';
import {CardFriendComponent} from '../card-friend/card-friend.component';
import {GroupFriendSearchComponent} from '../search-group-friend/group-friend-search.component';
import {FriendsService} from '../../../_services/friends.service';
import {UserBasicInfo} from '../../../_models/UserBasicInfo';
import {SIGNAL} from '@angular/core/primitives/signals';

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
  groupsViewEnabled = false;

  public SwitchView() {
    this.groupsViewEnabled = !this.groupsViewEnabled;
  }

  friendsList: WritableSignal<UserBasicInfo[]> = signal([]);

  constructor(friendsService: FriendsService) {
   friendsService.getUserFriends().subscribe( friends =>
     this.friendsList.set(friends)
   );
  }

}
