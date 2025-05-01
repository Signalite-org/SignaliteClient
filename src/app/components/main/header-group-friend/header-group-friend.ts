import {Component, EventEmitter, input, Output} from '@angular/core';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-header-group-friend',
  imports: [
    MatIcon,
  ],
  templateUrl: './header-group-friend.html',
  styleUrl: './header-group-friend.css'
})
export class HeaderGroupFriend {
  groupFriendName = input("Loading name...")
  isInFullChatMode= input(true)

  @Output() returnToNormalModeEvent = new EventEmitter<void>();

}
