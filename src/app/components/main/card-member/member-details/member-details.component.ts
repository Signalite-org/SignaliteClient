import { Component, input, OnInit, output, signal } from '@angular/core';
import { UserService } from '../../../../_services/user.service';
import { UserDTO } from '../../../../_models/UserDTO';
import { AccountService } from '../../../../_services/account.service';
import { FriendsService } from '../../../../_services/friends.service';
import { UserBasicInfo } from '../../../../_models/UserBasicInfo';
import { MatIcon } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-member-details',
  imports: [MatIcon],
  templateUrl: './member-details.component.html',
  styleUrl: './member-details.component.css'
})
export class MemberDetailsComponent implements OnInit{
  constructor(private userService: UserService, private friendsService: FriendsService, private toastr: ToastrService) 
  {}

  ngOnInit(): void {
    this.loadUserDetails()
    this.checkIfUserIsYourFriend()
  }

  userId = input.required<number>()
  isOnline = input.required<boolean>()
  userDto = signal<UserDTO>({id: -1, username: '', name: '', surname: '', profilePhotoUrl: '', backgroundPhotoUrl: ''})
  isLoading = signal<boolean>(false)
  errorMessage = signal<string>('')
  isUserFriend = signal<boolean>(false)
  close = output<void>()
  
  onCancel() {
    this.close.emit()
  }

  loadUserDetails(): void {
    this.isLoading.set(true);    
    this.userService.getUserInfo(this.userId()).subscribe({
      next: (userDto) => {
        this.userDto.set(userDto)
        console.log(userDto.backgroundPhotoUrl)
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message)
      }
    });
  }

  checkIfUserIsYourFriend() {
    this.friendsService.getUserFriends().subscribe({
        next: (friends: UserBasicInfo[]) => {
          if (friends.find(friend => friend.id === this.userId())) {
            this.isUserFriend.set(true)
          }
        }
      })
  }

  sendFriendRequest() {
      this.friendsService.sendFriendRequest(this.userDto().username).subscribe({
      next: () => {
        this.toastr.success("Friend request sent");
      },
      error: (error) => {
        this.toastr.error(error.message)
      }
    });
  }
}
