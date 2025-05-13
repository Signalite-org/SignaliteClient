import {Component, input, Input, output, signal, WritableSignal} from '@angular/core';
import {NgOptimizedImage} from "@angular/common";
import { UserBasicInfo } from '../../../_models/UserBasicInfo';
import { MatIcon } from '@angular/material/icon';
import { AccountService } from '../../../_services/account.service';

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
  constructor(private accountService: AccountService) {
    this.currentUserId.set(accountService.currentUser()!.userId)
  }
  isOnline = input(false);
  isPrivate = input.required<boolean>()
  user = input<UserBasicInfo>()
  startDeletingUser = output<void>()
  emitedUser = output<UserBasicInfo>()
  currentUserId = signal(-1)
  
  showUserDeleteConfirmation() {
    this.startDeletingUser.emit()
    this.emitedUser.emit(this.user()!)
    console.log("emited user: " + this.user()!.username)
  }

  
}
