import { Component, OnInit, OnDestroy, input, signal, effect } from '@angular/core';
import { CardMemberComponent } from '../card-member/card-member.component';
import { GroupService } from '../../../_services/group.service';
import { GroupMembersDTO } from '../../../_models/GroupMembersDTO';
import { UserBasicInfo } from '../../../_models/UserBasicInfo';
import { skip, Subscription } from 'rxjs';
import { PresenceService } from '../../../_services/presence.service';
import { NotificationsService } from '../../../_services/notifications.service';
import { DeleteUserConfirmationComponent } from "../../delete-user-confirmation/delete-user-confirmation.component";
import { ToastrService } from 'ngx-toastr';
import { GroupBasicInfoDTO } from '../../../_models/GroupBasicInfoDTO';

@Component({
  selector: 'app-section-members',
  imports: [
    CardMemberComponent,
    DeleteUserConfirmationComponent
],
  templateUrl: './section-members.component.html',
  styleUrl: './section-members.component.css'
})
export class SectionMembersComponent implements OnInit, OnDestroy {
  // Przyjmujemy ID grupy jako input
  groupId = input(-1);
 
  // Sygnały do przechowywania danych
  members = signal<UserBasicInfo[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  onlineUsersIds = signal<number[]>([]);
  isDeletingUser = signal(false)
  user = signal<UserBasicInfo>({id: -1, username: ""})
  isGroupPrivate = signal<boolean>(false)
 
  // Subskrypcja do śledzenia
  private membersSubscription?: Subscription;
 
  constructor(private groupService: GroupService, private presenceService: PresenceService, private notificationService: NotificationsService, private toastr: ToastrService) {
    // Efekt reagujący na zmianę groupId
    effect(() => {
      console.log('Effect: groupId zmienione na:', this.groupId());
      this.loadMembers();
    });
    
    effect(() => {
      const loadedMembers = this.groupService.groupMembers()
      console.log(loadedMembers)

      if (loadedMembers.owner.id !== -1) {
        this.members.set([...loadedMembers.members, loadedMembers.owner]);
        console.log(this.members())
        this.loading.set(false)
      }
    });


    effect(() => {
      const addedUser = this.notificationService.userAddedToGroup();
      console.log('User added to group notification:', addedUser);
      
      if (addedUser.id > 0 && this.groupId() > 0) {
        // Sprawdzamy czy użytkownik już istnieje w liście
        const currentMembers = this.members();
        
        // Sprawdzamy czy użytkownik nie jest już na liście
        const userExists = currentMembers.some(member => member.id === addedUser.id);
        
        if (!userExists) {
          console.log('Adding new user to members list:', addedUser);
          this.members.update(members => [...members, addedUser]);
        } else {
          console.log('User already exists in members list');
        }
        
        // Wyczyszczenie powiadomienia po przetworzeniu
        this.notificationService.clearUserAddedToGroup();
      }
    });
    // Efekt dla śledzenia użytkowników online
    effect(() => {
      let onlineUsers = this.presenceService.onlineUserIds()
      console.log('Online users updated:', onlineUsers);
      this.onlineUsersIds.set(onlineUsers);
      console.log('Online users updated:', this.onlineUsersIds());
    });
    
  }
 
  ngOnInit() {
    console.log('SectionMembersComponent: ngOnInit, groupId =', this.groupId());
  }
 
  ngOnDestroy() {
    // Sprzątanie subskrypcji
    if (this.membersSubscription) {
      this.membersSubscription.unsubscribe();
    }
  }
 
  isUserOnline(userId: number): boolean {
    return this.onlineUsersIds().some(id => id === userId);
  }

  onCloseAdd() {
    this.isDeletingUser.set(false);
  }

  onStartAdd() {
   this.isDeletingUser.set(true)
  }

  setUser(user: UserBasicInfo) {
    this.user.set(user)
  }

  loadMembers() {
    const currentGroupId = this.groupId();
    console.log('loadMembers wywoływane dla groupId:', currentGroupId);
   
    // Sprawdź czy ID grupy jest poprawne
    if (currentGroupId <= 0) {
      this.error.set('Nieprawidłowe ID grupy');
      return;
    }
   
    // Resetuj stan
    this.loading.set(true);
    this.error.set(null);
   
    this.groupService.getGroupMembers(currentGroupId);
    this.groupService.getGroupBasicInfo(this.groupId()).subscribe({
      next: (groupInfo: GroupBasicInfoDTO) => {
        this.isGroupPrivate.set(groupInfo.isPrivate)
      }
    })
    /*
    // Anuluj poprzednią subskrypcję jeśli istnieje
    if (this.membersSubscription) {
      this.membersSubscription.unsubscribe();
    }
   
    // Pobierz członków grupy
    this.membersSubscription = this.groupService.getGroupMembers(currentGroupId).subscribe({
      next: (response: GroupMembersDTO) => {
        console.log('Pobrano członków grupy:', response.members);
        this.members.set([...response.members, response.owner]);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Błąd podczas pobierania członków grupy:', err);
        this.error.set('Nie udało się pobrać członków grupy');
        this.loading.set(false);
        this.members.set([]);
      }
    });
    */
  }
}