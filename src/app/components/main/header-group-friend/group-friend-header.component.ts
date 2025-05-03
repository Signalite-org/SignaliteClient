import {Component, EventEmitter, input, Output} from '@angular/core';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-top-center',
  imports: [
    MatIcon,
  ],
  templateUrl: './group-friend-header.component.html',
  styleUrl: './group-friend-header.component.css'
})
export class GroupFriendHeaderComponent {
  groupFriendName = input("Loading name...")
  isInFullChatMode= input(true)

  @Output() returnToNormalModeEvent = new EventEmitter<void>();

}
