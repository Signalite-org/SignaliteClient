// friends.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FriendsService} from '../../_services/friends.service';
import { ToastrService } from 'ngx-toastr';
import { UserDTO } from '../../_models/UserDTO';
import { FriendRequestDTO } from '../../_models/FriendRequestDTO';
import { NotificationsService } from '../../_services/notifications.service';
import { skip } from 'rxjs';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.scss']
})
export class FriendsComponent implements OnInit {
  friends: UserDTO[] = [];
  friendRequests: FriendRequestDTO[] = [];
  isLoading = false;
  errorMessage = '';
  recipientIdControl = new FormControl('');

  constructor(
    private friendsService: FriendsService,
    private toastr: ToastrService,
    private notificationService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.loadFriendRequests();
    this.loadFriends();

    this.notificationService.friendRequests$.pipe(
      skip(1)
    ).subscribe(requests => {
      const newRequest = requests[requests.length - 1];
      const exists = this.friendRequests.some(req => req.id === newRequest.id);
      if (!exists) {
        this.friendRequests.push(newRequest);
        this.toastr.info('Nowe zaproszenie do znajomych!');
      }
    });
    
    this.notificationService.friendRequestsAccepted$.pipe(
      skip(1)
    ).subscribe(accepted => {
      const newFriend = accepted[accepted.length - 1]; // Get the newest friend
      const exists = this.friends.some(friend => friend.id === newFriend.id);
      
      if (!exists) {
        this.friends.push(newFriend);
        this.toastr.info('Nowy znajomy!');
      }
    });

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

  sendFriendRequest(): void {
    if (!this.recipientIdControl.value) {
      this.toastr.warning('Proszę podać ID odbiorcy');
      return;
    }

    const recipientId = parseInt(this.recipientIdControl.value, 10);
    if (isNaN(recipientId)) {
      this.toastr.warning('ID odbiorcy musi być liczbą');
      return;
    }

    this.isLoading = true;
    this.friendsService.sendFriendRequest(recipientId).subscribe({
      next: () => {
        this.toastr.success('Zaproszenie zostało wysłane');
        this.recipientIdControl.reset();
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