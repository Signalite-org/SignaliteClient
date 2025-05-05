import { Component, OnInit, OnDestroy, input, signal, effect } from '@angular/core';
import { CardMemberComponent } from '../card-member/card-member.component';
import { GroupService } from '../../../_services/group.service';
import { GroupMembersDTO } from '../../../_models/GroupMembersDTO';
import { UserBasicInfo } from '../../../_models/UserBasicInfo';
import { skip, Subscription } from 'rxjs';
import { PresenceService } from '../../../_services/presence.service';
import { NotificationsService } from '../../../_services/notifications.service';

@Component({
  selector: 'app-section-members',
  imports: [
    CardMemberComponent
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
 
  // Subskrypcja do śledzenia
  private membersSubscription?: Subscription;
  private lastProcessedUserAddedLength = 0;
 
  constructor(private groupService: GroupService, private presenceService: PresenceService, private notificationService: NotificationsService) {
    // Efekt reagujący na zmianę groupId
    effect(() => {
      console.log('Effect: groupId zmienione na:', this.groupId());
      this.loadMembers();
    });
    
    // Efekt dla śledzenia użytkowników online
    effect(() => {
      let onlineUsers = this.presenceService.onlineUserIds()
      console.log('Online users updated:', onlineUsers);
      this.onlineUsersIds.set(onlineUsers);
      console.log('Online users updated:', this.onlineUsersIds());
    });

    // Effect for user added to group notifications
    effect(() => {
      const usersAdded = this.notificationService.userAddedToGroup();
      
      // Only process if there are new items
      if (usersAdded.length > 0 && usersAdded.length > this.lastProcessedUserAddedLength) {
        // Get the newest added user
        const newUser = usersAdded[usersAdded.length - 1];
        
        // Check if they belong to our current group (you might need to refine this logic)
        // and if they already exist in our local array
        const exists = this.members().some(req => req.id === newUser.id);
        if (!exists) {
          this.members.update(current => [...current, newUser]);
        }
        
        // Update the processed length
        this.lastProcessedUserAddedLength = usersAdded.length;
      }
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
  }

}