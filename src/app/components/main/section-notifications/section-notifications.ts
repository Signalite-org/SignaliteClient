import { Component, computed, signal } from '@angular/core';
import { IconRegistrator } from '../../../_utils/icon-registrator.service';
import { FormsModule } from '@angular/forms';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { FriendRequestsListComponent } from "../../friend-requests-list/friend-requests-list.component";
import { FriendsService } from '../../../_services/friends.service';

@Component({
  selector: 'app-section-notifications',
  imports: [
    MatIcon,
    FormsModule,
    MatIconModule,
    FriendRequestsListComponent
],
  templateUrl: './section-notifications.html',
  styleUrl: './section-notifications.css',
  providers: [IconRegistrator]
})
export class SectionNotifications {
  showFriendRequests = signal(false);
  pendingRequestsCount = computed(() => this.friendsService.friendRequests().length);

  constructor(
    private friendsService: FriendsService
  ) { }

  toggleFriendRequests(): void {
    this.showFriendRequests.update(value => !value);
  }
  
  closeFriendRequests(): void {
    this.showFriendRequests.set(false);
  }
}
