import {Component, input, signal, WritableSignal, effect} from '@angular/core';
import {CardFriendComponent} from '../card-friend/card-friend.component';
import {GroupFriendSearchComponent} from '../search-group-friend/group-friend-search.component';
import {UserBasicInfo} from '../../../_models/UserBasicInfo';
import {GroupBasicInfoDTO} from '../../../_models/GroupBasicInfoDTO';
import {GroupService} from '../../../_services/group.service';

@Component({
  selector: 'section-group-friends',
  imports: [
    CardFriendComponent,
    GroupFriendSearchComponent,
  ],
  templateUrl: './section-group-friends.html',
  styleUrl: './section-group-friends.css'
})
export class SectionGroupFriends {

  groupsViewEnabled = input(false);
  currentUser = input<UserBasicInfo | null>(null);

  // stores all groups
  private groupList: WritableSignal<GroupBasicInfoDTO[]> = signal([]);
  //

  // stores either private or not private groups
  protected filteredGroups: WritableSignal<GroupBasicInfoDTO[]> = signal([]);
  //

  constructor(groupsService: GroupService) {
    groupsService.getGroups().subscribe( groups => {
      this.groupList.set(groups);
      this.updateFilteredGroups();
    }
   );
    effect(() => {
      this.updateFilteredGroups();
    });
  }

  updateFilteredGroups() {
    if(this.currentUser ==  null)
      return;

    if(this.groupsViewEnabled()) {
      // set filtered groups to public groups
      this.filteredGroups.set(this.groupList().filter((group) => !group.isPrivate))

    } else {
      // set filtered groups to private groups (2 users - direct friend messages)
      this.filteredGroups.set(this.groupList().filter((group) => group.isPrivate))
    }
  }

}
