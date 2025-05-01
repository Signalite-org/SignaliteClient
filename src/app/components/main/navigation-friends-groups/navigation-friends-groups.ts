import {Component, EventEmitter, Output, signal, WritableSignal} from '@angular/core';
import {GroupFriendsSwitchComponent} from '../switch-group-friends/group-friends-switch.component';
import {MatMiniFabButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'navigation-friends-groups',
  imports: [
    GroupFriendsSwitchComponent,
    MatIcon,
  ],
  templateUrl: './navigation-friends-groups.html',
  styleUrl: './navigation-friends-groups.scss'
})
export class NavigationFriendsGroups {
  addIcon: WritableSignal<string> = signal("addUser");

  @Output() isGroupsViewEnabledEvent = new EventEmitter<boolean>(false);

  isGroupsViewEnabled(showGroups :boolean) {
    this.isGroupsViewEnabledEvent.emit(showGroups);
    if(showGroups) {
      this.addIcon.set("addGroup");
    } else {
      this.addIcon.set("addUser");
    }
  }
}
