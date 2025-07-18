import {Component, computed, effect, EventEmitter, HostListener, input, output, Output, signal, WritableSignal} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {GroupService} from '../../../_services/group.service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../_services/user.service';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer } from '@angular/platform-browser';
import { NotificationsService } from '../../../_services/notifications.service';
import { CallButtonComponent } from '../../call/call-button/call-button.component';
import { AccountService } from '../../../_services/account.service';
import { SectionNotifications } from '../section-notifications/section-notifications';
import { FriendRequestsListComponent } from "../../friend-requests-list/friend-requests-list.component";
import { FriendsService } from '../../../_services/friends.service';

@Component({
  selector: 'app-header-group-friend',
  imports: [
    MatIcon,
    FormsModule,
    CallButtonComponent,
    FriendRequestsListComponent
],
  templateUrl: './header-group-friend.html',
  styleUrl: './header-group-friend.css'
})
export class HeaderGroupFriend {
  groupFriendName: WritableSignal<string> = signal("");
  isPrivate: WritableSignal<Boolean> = signal(false);
  username = signal("");
  isInFullChatMode = input(true);
  groupId = input(-1);
  userId = signal(-1);
  areOptionsVisible = signal(false);
  isRenaming = signal(false);
  isAddingUser = signal(false);
  isDeleting = signal(false);
  newGroupName = signal("");
  selectedFile = signal<File | null>(null)

  showFriendRequests = signal(false);
  pendingRequestsCount = computed(() => this.friendsService.friendRequests().length);
  
  // Add property to track the other user's ID in a private chat
  otherUserId: WritableSignal<number> = signal(-1);

  constructor(
    private groupService: GroupService,
    private userService: UserService,
    private toastr: ToastrService,
    private notificationService: NotificationsService,
    private friendsService: FriendsService,
    private sanitizer: DomSanitizer,
    private accountService: AccountService
  ) {

    this.notificationService.userUpdated$.subscribe(updatedUser => {
      const isPrivateChat = this.isPrivate();
      if (updatedUser.id > 0 && isPrivateChat) {
        this.groupFriendName.set(updatedUser.username);
      }
    })

    effect(() => {
    const id = this.groupId();
    if(id > 0) {
      groupService.getGroupBasicInfo(id).subscribe(group => {
        this.groupFriendName.set(group.name);
        this.isPrivate.set(group.isPrivate);
        this.newGroupName.set(group.name);

        // If it's a private group, fetch members
        if (group.isPrivate) {
          this.groupService.getGroupMembers(id);
        } else {
          this.otherUserId.set(-1);
        }
      });
    } else {
      this.groupFriendName.set("");
      this.isPrivate.set(false);
      this.newGroupName.set("");
      this.username.set("");
      this.otherUserId.set(-1);
    }
  });

  effect(() => {
    const members = this.groupService.groupMembers();
    const isPrivate = this.isPrivate();
    
    // Only process if this is a private group and we have valid members data
    if (isPrivate && members && members.members && members.members.length > 0) {
      const currentUserId = this.accountService.currentUser()?.userId || -1;
      console.log("[Header]Processing group members - current user:", currentUserId);
      
      const otherUser = members.members.find(m => m.id !== currentUserId);
      if(otherUser) {
        this.otherUserId.set(otherUser.id);
        console.log("[Header]Other user id set to member with id: ", otherUser.id);
      } else if (members.owner && members.owner.id !== currentUserId) {
        this.otherUserId.set(members.owner.id);
        console.log("[Header]Other user id set to owner with id: ", members.owner.id);
      }
    }
  });

  }

  returnToNormalModeEvent = output<void>();
  showMembersAndNotifications = output<void>();
  groupDeleted = output<number>();

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Check if click was outside the dropdown and its toggle button
    if (!target.closest('.options-dropdown') && !target.closest('.group-name')) {
      this.areOptionsVisible.set(false);
      this.isRenaming.set(false);
      this.isAddingUser.set(false);
    }
  }

  // Toggle options dropdown
  toggleOptions(event?: MouseEvent) {
    if (event) {
      event.stopPropagation(); // Prevent document click from immediately closing
    }
    this.areOptionsVisible.update(value => !value);
    if (!this.areOptionsVisible()) {
      this.isRenaming.set(false);
      this.isAddingUser.set(false);
    }
  }

  toggleFriendRequests(): void {
    this.showFriendRequests.update(value => !value);
  }
  
  closeFriendRequests(): void {
    this.showFriendRequests.set(false);
  }

  // Show rename input
  showRenameInput() {
    this.isRenaming.set(!this.isRenaming());
  }

  showAddingUserInput() {
    this.isAddingUser.set(!this.isAddingUser());
  }

  hideGroupDeleteConfirmation() {
    this.isDeleting.set(false)
  }

  showGroupDeleteConfirmation() {
    this.isDeleting.set(true)
  }

  // Rename group
  renameGroup() {
    if (!this.newGroupName().trim()) {
      this.toastr.warning('Group name cannot be empty');
      return;
    }

    this.groupService.modifyGroupName(this.groupId(), this.newGroupName()).subscribe({
      next: () => {
        this.groupFriendName.set(this.newGroupName());
        this.isRenaming.set(false);
        this.areOptionsVisible.set(false);
        this.toastr.success('Group renamed successfully');
      },
      error: (error) => {
        console.error('Error renaming group:', error);
        this.toastr.error(error);
      }
    });
  }

  // Add user to group
  addUser() {
    // Sprawdź czy nazwa użytkownika nie jest pusta
    if (!this.username().trim()) {
      this.toastr.warning('Wprowadź nazwę użytkownika');
      return;
    }

    // Sprawdź czy mamy poprawne ID grupy
    if (this.groupId() <= 0) {
      this.toastr.error('Nieprawidłowe ID grupy');
      return;
    }

    // Najpierw pobierz ID użytkownika na podstawie nazwy
    this.userService.getUserByUsername(this.username()).subscribe({
      next: (user) => {
        if (!user || user.id <= 0) {
          this.toastr.error('Nie znaleziono użytkownika o podanej nazwie');
          return;
        }

        // Ustaw ID użytkownika
        this.userId.set(user.id);

        // Teraz dodaj użytkownika do grupy
        this.groupService.addUserToGroup(this.groupId(), user.id).subscribe({
          next: () => {
            this.isAddingUser.set(false);
            this.toastr.success(`Użytkownik ${this.username()} został dodany do grupy`);
            this.username.set(''); // Wyczyść pole po dodaniu
          },
          error: (error) => {
            console.error('Błąd podczas dodawania użytkownika do grupy:', error);
            this.toastr.error(error);
          }
        });
      },
      error: (error) => {
        console.error('Błąd podczas wyszukiwania użytkownika:', error);
        this.toastr.error(error);
      }
    });
  }

  // Delete group
  deleteGroup() {
    this.groupService.deleteGroup(this.groupId()).subscribe({
      next: () => {
        const successMessage = this.isPrivate() ? 'Friend removed successfully' : 'Group deleted successfully'
        this.toastr.success(successMessage);
        this.returnToNormalModeEvent.emit(); // Return to normal mode after deletion
        this.groupDeleted.emit(this.groupId())
        this.hideGroupDeleteConfirmation();
      },
      error: (error) => {
        console.error('Error deleting group:', error);
        this.toastr.error(error);
        this.hideGroupDeleteConfirmation();
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
      this.uploadGroupPhoto();
    }
  }

  uploadGroupPhoto() {
    if (!this.selectedFile) {
      this.toastr.warning('No file selected');
      return;
    }

    // Check file type
    if (!this.selectedFile()!.type.match(/image\/(jpeg|jpg|png)/)) {
      this.toastr.error('Invalid file type. Please select an image file (JPEG, PNG)');
      return;
    }

    if (this.selectedFile()!.size > 10 * 1024 * 1024) {
      this.toastr.error('File is too large. Maximum size is 10MB');
      return;
    }

    this.groupService.updateGroupPhoto(this.groupId(), this.selectedFile()!).subscribe({
      next: () => {
        this.toastr.success('Group photo updated successfully');
        this.areOptionsVisible.set(false);
        this.selectedFile.set(null);
      },
      error: (error) => {
        console.error('Error updating group photo:', error);
        this.toastr.error(error);
      }
    });
  }



}