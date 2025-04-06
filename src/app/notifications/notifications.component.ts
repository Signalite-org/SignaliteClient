import { Component, OnInit } from '@angular/core';
import { NotificationsService } from '../_services/notifications.service';

import { GroupBasicInfoDTO } from '../_models/GroupBasicInfo';
import { CommonModule } from '@angular/common';
import { FriendRequestAccepted } from '../_models/FriendRequestAccepted';
import { FriendRequest } from '../_models/FriendRequest';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  friendRequests: FriendRequest[] = [];
  friendRequestsAccepted: FriendRequestAccepted[] = [];
  addedToGroups: GroupBasicInfoDTO[] = [];
  
  constructor(private notificationsService: NotificationsService) {}
  
  ngOnInit(): void {
    // Subscribe to notifications
    this.notificationsService.friendRequests$.subscribe(requests => {
      this.friendRequests = requests;
    });
    
    this.notificationsService.friendRequestsAccepted$.subscribe(accepted => {
      this.friendRequestsAccepted = accepted;
    });
    
    this.notificationsService.addedToGroup$.subscribe(groups => {
      this.addedToGroups = groups;
    });
  }
  
  clearFriendRequests(): void {
    this.notificationsService.clearFriendRequests();
  }
  
  clearFriendRequestsAccepted(): void {
    this.notificationsService.clearFriendRequestsAccepted();
  }
  
  clearAddedToGroup(): void {
    this.notificationsService.clearAddedToGroup();
  }
}
