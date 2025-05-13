import { Component, computed, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { FriendsService } from '../../_services/friends.service';
import { ToastrService } from 'ngx-toastr';
import { FriendRequestDTO } from '../../_models/FriendRequestDTO';
import { CommonModule } from '@angular/common';
import { GroupService } from '../../_services/group.service';

@Component({
  selector: 'app-friend-requests-list',
  imports: [CommonModule],
  templateUrl: './friend-requests-list.component.html',
  styleUrl: './friend-requests-list.component.css'
})
export class FriendRequestsListComponent implements OnInit {
  friendRequests = computed(() => this.friendsService.friendRequests());
  isLoading = signal(false);
  errorMessage = signal("");
  @Output() close = new EventEmitter<void>();
  
  constructor(
    public friendsService: FriendsService,
    private groupService: GroupService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadFriendRequests();
  }

  loadFriendRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set("");
    
    this.friendsService.loadFriendRequests().subscribe({
      next: () => {
        // No need to update local state since we use computed
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message);
        this.isLoading.set(false);
        this.toastr.error("Failed to load friend requests");
      }
    });
  }

  acceptRequest(requestId: number): void {
    this.isLoading.set(true);
    
    this.friendsService.acceptFriendRequest(requestId).subscribe({
      next: () => {
        this.groupService.fetchGroups();
        this.isLoading.set(false);
        this.toastr.success("Friend request accepted");
      },
      error: (error) => {
        this.errorMessage.set(error.message);
        this.isLoading.set(false);
        this.toastr.error("Failed to accept friend request");
      }
    });
  }

  declineRequest(requestId: number): void {
    this.isLoading.set(true);
    
    this.friendsService.declineFriendRequest(requestId).subscribe({
      next: () => {
        // The service handles updating the friendRequests
        this.isLoading.set(false);
        this.toastr.success("Friend request declined");
      },
      error: (error) => {
        this.errorMessage.set(error.message);
        this.isLoading.set(false);
        this.toastr.error("Failed to decline friend request");
      }
    });
  }

  onCancel(){
    this.close.emit()
  }
}
