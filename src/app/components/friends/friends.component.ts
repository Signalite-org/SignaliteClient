// friends.component.ts
import { Component, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FriendsService} from '../../_services/friends.service';
import { ToastrService } from 'ngx-toastr';
import { UserDTO } from '../../_models/UserDTO';
import { FriendRequestDTO } from '../../_models/FriendRequestDTO';
import { NotificationsService } from '../../_services/notifications.service';
import { isEmpty, skip } from 'rxjs';
import { UserBasicInfo } from '../../_models/UserBasicInfo';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.scss']
})
export class FriendsComponent implements OnInit {
  friends: UserBasicInfo[] = [];
  friendRequests: FriendRequestDTO[] = [];
  isLoading = false;
  errorMessage = '';
  recipientUsernameControl = new FormControl('');

  private lastProcessedFriendRequestsLength = 0;
  private lastProcessedFriendsLength = 0;

  constructor(
    private friendsService: FriendsService,
    private toastr: ToastrService,
    private notificationService: NotificationsService
  ) {
    // Create effects to respond to signal changes
    effect(() => {
      // Get the current friend requests from the signal
      const currentRequests = this.notificationService.friendRequests();
      
      // Only process if there are new items (similar to skip(1) behavior)
      if (currentRequests.length > 0 && currentRequests.length > this.lastProcessedFriendRequestsLength) {
        // Get the newest request
        const newRequest = currentRequests[currentRequests.length - 1];
        
        // Check if it already exists in our local array
        const exists = this.friendRequests.some(req => req.id === newRequest.id);
        if (!exists) {
          this.friendRequests.push(newRequest);
          this.toastr.info('Nowe zaproszenie do znajomych!');
        }
        
        // Update the processed length
        this.lastProcessedFriendRequestsLength = currentRequests.length;
      }
    });
    
    effect(() => {
      // Get the current accepted friend requests from the signal
      const currentAccepted = this.notificationService.friendRequestsAccepted();
      
      // Only process if there are new items
      if (currentAccepted.length > 0 && currentAccepted.length > this.lastProcessedFriendsLength) {
        // Get the newest accepted friend
        const newFriend = currentAccepted[currentAccepted.length - 1];
        
        // Check if it already exists in our local array
        const exists = this.friends.some(friend => friend.id === newFriend.id);
        if (!exists) {
          this.friends.push(newFriend);
          this.toastr.info('Nowy znajomy!');
        }
        
        // Update the processed length
        this.lastProcessedFriendsLength = currentAccepted.length;
      }
    });


  }

  ngOnInit(): void {
    this.loadFriendRequests();
    this.loadFriends();

    /*
    // Notyfikacja otrzymania zaproszenia
    this.notificationService.friendRequest$.subscribe(notification => {
      const exists = this.friendRequests.some(req => req.id === notification.id);
      if (!exists) {
        this.friendRequests.push(notification);
        this.toastr.info('Nowe zaproszenie do znajomych!');
      } else {
        console.log('⚠️ Duplikat zaproszenia – pomijam:', notification);
      } 
    });

    this.notificationService.newFriend$.subscribe(notification => {
      const exists = this.friends.some(req => req.id === notification.id);
      if (!exists) {
        this.friends.push(notification);
        this.toastr.info('Nowy znajomy!');
      } else {
        console.log('⚠️ Duplikat znajomego – pomijam:', notification);
      } 
    });
    */
  }

  loadFriends(): void {
    this.isLoading = true;
    this.friendsService.getUserFriends().subscribe({
      next: (response) => {
        this.friends = response;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  loadFriendRequests(): void {
    this.isLoading = true;
    this.friendsService.getFriendRequests().subscribe({
      next: (response) => {
        this.friendRequests = response;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  acceptFriendRequest(requestId: number): void {
    this.isLoading = true;
    this.friendsService.acceptFriendRequest(requestId).subscribe({
      next: () => {
        this.toastr.success('Zaproszenie zaakceptowane');
        this.loadFriendRequests();
        this.loadFriends();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  declineFriendRequest(requestId: number): void {
    this.isLoading = true;
    this.friendsService.declineFriendRequest(requestId).subscribe({
      next: () => {
        this.toastr.success('Zaproszenie odrzucone');
        this.loadFriendRequests();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }
}