import {Component, EventEmitter, Output, signal, WritableSignal} from '@angular/core';
import {GroupFriendsSwitchComponent} from '../switch-group-friends/group-friends-switch.component';
import {MatMiniFabButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import { NewGroupComponent } from "../new-group/new-group.component";
import { SendFriendRequestComponent } from '../../send-friend-request/send-friend-request.component';

@Component({
  selector: 'navigation-friends-groups',
  imports: [
    GroupFriendsSwitchComponent,
    MatIcon,
    NewGroupComponent,
    SendFriendRequestComponent
],
  templateUrl: './navigation-friends-groups.html',
  styleUrl: './navigation-friends-groups.scss'
})
export class NavigationFriendsGroups {
  addIcon: WritableSignal<string> = signal("addUser");

  @Output() isGroupsViewEnabledEvent = new EventEmitter<boolean>(false);
  protected isAddingGroup : WritableSignal<Boolean> = signal(false)
  protected isAddingFriend: WritableSignal<boolean> = signal(false);

  isGroupsViewEnabled(showGroups :boolean) {
    this.isGroupsViewEnabledEvent.emit(showGroups);
    if(showGroups) {
      this.addIcon.set("addGroup");
    } else {
      this.addIcon.set("addUser");
    }
  }

  onCloseAdd() {
    this.isAddingGroup.set(false);
    this.isAddingFriend.set(false);
  }

  onStartAdd() {
    if(this.addIcon() === "addGroup") {
      this.isAddingGroup.set(true);
    } else {
      this.isAddingFriend.set(true);
    }
  }
}
