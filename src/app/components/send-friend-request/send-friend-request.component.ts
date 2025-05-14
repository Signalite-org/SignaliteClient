import { CommonModule } from '@angular/common';
import { Component, computed, output, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { FriendsService } from '../../_services/friends.service';
import { UserService } from '../../_services/user.service';

@Component({
  selector: 'app-send-friend-request',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './send-friend-request.component.html',
  styleUrl: './send-friend-request.component.css'
})
export class SendFriendRequestComponent {
  
  
  constructor(
    private userService: UserService,
    private friendsService: FriendsService, 
    private toastr: ToastrService
  ) {}

  errorMessage = signal("");
  username = signal("");
  usernameLength = computed(() => this.username().length);
  isLoading = signal(false);
  close = output<void>();

  checkUserExists(username: string) {
    this.isLoading.set(true);
    this.userService.checkUserExists(username).subscribe({
      next: (exists) => {
        if (exists) {
          this.sendRequest(username);
        } else {
          this.errorMessage.set("User does not exist");
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        this.errorMessage.set(error.message);
        this.isLoading.set(false);
      }
    });
  }

  sendRequest(username: string) {
    this.friendsService.sendFriendRequest(username).subscribe({
      next: () => {
        this.username.set("");
        this.errorMessage.set("");
        this.isLoading.set(false);
        this.onCancel();
        this.toastr.success("Friend request sent");
      },
      error: (error) => {
        this.errorMessage.set(error.message);
        this.isLoading.set(false);
      }
    });
  }


  onCancel() {
    this.close.emit();  
  }

  onSubmit() {
    const usernameValue = this.username().trim();
    
    // Validate input
    if (usernameValue === "") {
      this.errorMessage.set("Username cannot be empty");
      return;
    }

    if (usernameValue.length < 3 || usernameValue.length > 16) {
      this.errorMessage.set("Username must be between 3 and 16 characters");
      return;
    }

    // Check if user exists then send request
    this.checkUserExists(usernameValue);
  }
}

