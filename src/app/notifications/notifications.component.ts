import { Component, OnInit } from '@angular/core';
import { NotificationsService } from '../_services/notifications.service';
import { GroupBasicInfoDTO } from '../_models/GroupBasicInfoDTO';
import { CommonModule } from '@angular/common';
import { FriendRequestDTO } from '../_models/FriendRequestDTO';
import { UserBasicInfo } from '../_models/UserBasicInfo';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  get friendRequests(): FriendRequestDTO[] {
    return this.notificationsService.friendRequests();
  }


  get friendRequestsAccepted(): UserBasicInfo[] {
    return this.notificationsService.friendRequestsAccepted();
  }
  
  get addedToGroups(): GroupBasicInfoDTO[] {
    return this.notificationsService.addedToGroup();
  }
  
  constructor(private notificationsService: NotificationsService) {}
  
  ngOnInit(): void {

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
