import {Component, effect, EventEmitter, HostListener, input, output, Output, signal, WritableSignal} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {GroupService} from '../../../_services/group.service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../_services/user.service';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-header-group-friend',
  imports: [
    MatIcon,
    FormsModule
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
  newGroupName = signal("");
  selectedFile = signal<File | null>(null)
  
  constructor(
    private groupService: GroupService, 
    private userService: UserService, 
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {
    effect(() => {
      console.log(this.groupId());
      const id = this.groupId();
      if(id > 0) {
        groupService.getGroupBasicInfo(id).subscribe(group => {
          this.groupFriendName.set(group.name);
          this.isPrivate.set(group.isPrivate);
          this.newGroupName.set(group.name); // Initialize rename input
        });
      }
      else {
          this.groupFriendName.set("");
          this.isPrivate.set(false);
          this.newGroupName.set(""); // Initialize rename input
          this.username.set("")
      }
    });
  }
  
  returnToNormalModeEvent = output<void>()
  groupDeleted = output<number>()
  
  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Check if click was outside the dropdown and its toggle button
    if (!target.closest('.options-dropdown') && !target.closest('.group-name')) {
      this.areOptionsVisible.set(false);
      this.isRenaming.set(false);
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
    }
  }
  
  // Show rename input
  showRenameInput() {
    this.isRenaming.set(true);
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
  
  // Delete group
  deleteGroup() {
    if (confirm('Are you sure you want to delete this group?')) {
      this.groupService.deleteGroup(this.groupId()).subscribe({
        next: () => {
          this.toastr.success('Group deleted successfully');
          this.returnToNormalModeEvent.emit(); // Return to normal mode after deletion
          this.groupDeleted.emit(this.groupId())
        },
        error: (error) => {
          console.error('Error deleting group:', error);
          this.toastr.error(error);
        }
      });
    }
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
}