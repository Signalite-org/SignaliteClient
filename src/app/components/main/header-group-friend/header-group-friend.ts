import {Component, effect, EventEmitter, input, Output, signal, WritableSignal} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {GroupService} from '../../../_services/group.service';

@Component({
  selector: 'app-header-group-friend',
  imports: [
    MatIcon,
  ],
  templateUrl: './header-group-friend.html',
  styleUrl: './header-group-friend.css'
})
export class HeaderGroupFriend {
  groupFriendName : WritableSignal<string> = signal("");
  isInFullChatMode= input(true);
  groupId = input(-1)

  constructor(groupService: GroupService) {
    effect(() => {
      console.log(this.groupId());
      const id = this.groupId();

      if(id > 0) {
        groupService.getGroupBasicInfo(id).subscribe(group =>
          this.groupFriendName.set(group.name)
        )
      }
    });
  }

  @Output() returnToNormalModeEvent = new EventEmitter<void>();

}
