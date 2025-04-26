// groups.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GroupService } from '../../_services/group.service';
import { ToastrService } from 'ngx-toastr';
import { GroupBasicInfoDTO } from '../../_models/GroupBasicInfoDTO';
import { GroupMembersDTO } from '../../_models/GroupMembersDTO';
import { NotificationsService } from '../../_services/notifications.service';
import { skip } from 'rxjs';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.scss']
})
export class GroupsComponent implements OnInit {
  groups: GroupBasicInfoDTO[] = [];
  selectedGroup: GroupBasicInfoDTO | null = null;
  groupMembers: GroupMembersDTO | null = null;
  isLoading = false;
  errorMessage = '';
  
  groupNameControl = new FormControl('');
  userIdToAddControl = new FormControl('');
  selectedFile: File | null = null;

  constructor(
    private groupService: GroupService,
    private toastr: ToastrService,
    private notificationService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.loadGroups();

    this.notificationService.addedToGroup$.pipe(
          skip(1)
        ).subscribe(requests => {
          const newGroup = requests[requests.length - 1];
          const exists = this.groups.some(req => req.id === newGroup.id);
          if (!exists) {
            this.groups.push(newGroup);
            this.toastr.info('Dodano cie do nowej grupy!');
          }
    });

    this.notificationService.userAddedToGroup$.pipe(
      skip(1)
    ).subscribe(requests => {
      const newUser = requests[requests.length - 1];
      const exists = this.groupMembers?.members.some(req => req.id === newUser.id);
      if (!exists) {
        this.groupMembers?.members.push(newUser);
        this.toastr.info('Nowy uzytkownik dodany do grupy');
      }
  });

  }

  loadGroups(): void {
    this.isLoading = true;
    this.groupService.getGroups().subscribe({
      next: (response) => {
        this.groups = response;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  createGroup(): void {
    if (!this.groupNameControl.value) {
      this.toastr.warning('Proszę podać nazwę grupy');
      return;
    }

    this.isLoading = true;
    this.groupService.createGroup(this.groupNameControl.value).subscribe({
      next: () => {
        this.toastr.success('Grupa została utworzona');
        this.groupNameControl.reset();
        this.loadGroups();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  selectGroup(group: GroupBasicInfoDTO): void {
    this.selectedGroup = group;
    this.loadGroupMembers(group.id);
  }

  loadGroupMembers(groupId: number): void {
    this.isLoading = true;
    this.groupService.getGroupMembers(groupId).subscribe({
      next: (response) => {
        this.groupMembers = response;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  modifyGroupName(): void {
    if (!this.selectedGroup || !this.groupNameControl.value) {
      this.toastr.warning('Wybierz grupę i podaj nową nazwę');
      return;
    }

    this.isLoading = true;
    this.groupService.modifyGroupName(this.selectedGroup.id, this.groupNameControl.value).subscribe({
      next: () => {
        this.toastr.success('Nazwa grupy została zmieniona');
        this.loadGroups();
        if (this.selectedGroup) {
          this.loadGroupMembers(this.selectedGroup.id);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.selectedFile = element.files[0];
    }
  }

  updateGroupPhoto(): void {
    if (!this.selectedGroup || !this.selectedFile) {
      this.toastr.warning('Wybierz grupę i zdjęcie');
      return;
    }

    this.isLoading = true;
    this.groupService.updateGroupPhoto(this.selectedGroup.id, this.selectedFile).subscribe({
      next: () => {
        this.toastr.success('Zdjęcie grupy zostało zaktualizowane');
        this.selectedFile = null;
        this.loadGroups();
        if (this.selectedGroup) {
          this.loadGroupMembers(this.selectedGroup.id);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  deleteGroup(): void {
    if (!this.selectedGroup) {
      this.toastr.warning('Wybierz grupę do usunięcia');
      return;
    }

    if (!confirm(`Czy na pewno chcesz usunąć grupę ${this.selectedGroup.name}?`)) {
      return;
    }

    this.isLoading = true;
    this.groupService.deleteGroup(this.selectedGroup.id).subscribe({
      next: () => {
        this.toastr.success('Grupa została usunięta');
        this.selectedGroup = null;
        this.groupMembers = null;
        this.loadGroups();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  addUserToGroup(): void {
    if (!this.selectedGroup || !this.userIdToAddControl.value) {
      this.toastr.warning('Wybierz grupę i podaj ID użytkownika');
      return;
    }

    const userId = parseInt(this.userIdToAddControl.value, 10);
    if (isNaN(userId)) {
      this.toastr.warning('ID użytkownika musi być liczbą');
      return;
    }

    this.isLoading = true;
    this.groupService.addUserToGroup(this.selectedGroup.id, userId).subscribe({
      next: () => {
        this.toastr.success('Użytkownik został dodany do grupy');
        this.userIdToAddControl.reset();
        if (this.selectedGroup) {
          this.loadGroupMembers(this.selectedGroup.id);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    });
  }

  removeUserFromGroup(userId: number): void {
    if (!this.selectedGroup) {
      this.toastr.warning('Wybierz grupę');
      return;
    }

    this.isLoading = true;
    this.groupService.removeUserFromGroup(this.selectedGroup.id, userId).subscribe({
      next: () => {
        this.toastr.success('Użytkownik został usunięty z grupy');
        if (this.selectedGroup) {
          this.loadGroupMembers(this.selectedGroup.id);
        }
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