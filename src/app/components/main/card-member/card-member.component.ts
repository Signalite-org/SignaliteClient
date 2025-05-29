import {Component, input, Input, output, signal, WritableSignal} from '@angular/core';
import {NgOptimizedImage} from "@angular/common";
import { UserBasicInfo } from '../../../_models/UserBasicInfo';
import { MatIcon } from '@angular/material/icon';
import { AccountService } from '../../../_services/account.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-card-member',
    imports: [
        NgOptimizedImage,
        MatIcon
    ],
  templateUrl: './card-member.component.html',
  styleUrl: './card-member.component.css'
})
export class CardMemberComponent {
  constructor(private accountService: AccountService, private router: Router) {
    this.currentUserId.set(this.accountService.currentUser()!.userId)
  }
  isOnline = input(false);
  isPrivate = input.required<boolean>()
  user = input<UserBasicInfo>()
  startDeletingUser = output<void>()
  startShowingUserDetails = output<void>()
  emitedUser = output<UserBasicInfo>()
  currentUserId = signal(-1)
  currentUserUsername = signal('')
  
  
  showUserDeleteConfirmation() {
    this.startDeletingUser.emit()
    this.emitedUser.emit(this.user()!)
    console.log("emited user: " + this.user()!.username)
  }

  showUserDetails() {
    if (this.currentUserId() === this.user()!.id) {
      this.router.navigateByUrl('/settings')
    }
    else {
      this.startShowingUserDetails.emit()
      this.emitedUser.emit(this.user()!)
    }
  }
}
