import {Component, input, signal, WritableSignal, effect, Output, EventEmitter, OnInit, OnDestroy} from '@angular/core';
import {CardFriendComponent} from '../card-friend/card-friend.component';
import {GroupFriendSearchComponent} from '../search-group-friend/group-friend-search.component';
import {UserBasicInfo} from '../../../_models/UserBasicInfo';
import {GroupBasicInfoDTO} from '../../../_models/GroupBasicInfoDTO';
import {GroupService} from '../../../_services/group.service';
import {MessageDTO} from '../../../_models/MessageDTO';
import {skip, Subscription} from 'rxjs';
import {MessageOfGroupDTO} from '../../../_models/MessageOfGroupDTO';
import { NotificationsService } from '../../../_services/notifications.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'section-group-friends',
  imports: [
    CardFriendComponent,
    GroupFriendSearchComponent,
  ],
  templateUrl: './section-group-friends.html',
  styleUrl: './section-group-friends.css'
})
export class SectionGroupFriends implements OnInit, OnDestroy {
  @Output() onGroupFriendClicked = new EventEmitter<number>();
 
  // SUBSCRIPTIONS
  private newMessageSubscription?: Subscription;
  private groupsSubscription?: Subscription;
  private lastProcessedAddedToGroupLength = 0;

  // CONSTRUCTOR
  constructor(private groupsService: GroupService, private notifiactionService: NotificationsService, private toastr: ToastrService) {
    effect(() => {
      this.updateFilteredGroups();
    });
   
    // LIVE EVENTS dla wiadomości z zewnętrznego źródła (np. SignalR)
    effect(() => {
      const emitter = this.newMessageTrigger();
      // Wypisz poprzednią subskrypcję (jeśli istnieje)
      this.newMessageSubscription?.unsubscribe();
      // Subskrybuj nową
      if (emitter) {
        this.newMessageSubscription = emitter.subscribe((messages: MessageOfGroupDTO[]) => {
          this.handleNewMessages(messages);
        });
      }
    });

    // Effect for added to group notifications
    effect(() => {
      const groups = this.notifiactionService.addedToGroup();
      
      // Only process if there are new items beyond what we've already processed
      if (groups.length > 0 && groups.length > this.lastProcessedAddedToGroupLength) {
        const newGroup = groups[groups.length - 1];
        const exists = this.groupList().some(group => group.id === newGroup.id);
        
        if (!exists) {
          this.groupList.update(current => [...current, newGroup]);
          this.toastr.info('Dodano cie do nowej grupy!');
        }
        
        // Update our processed length marker
        this.lastProcessedAddedToGroupLength = groups.length;
      }
    });
  }
 
  ngOnInit() {
    // Subskrybuj zmiany w liście grup
    this.groupsSubscription = this.groupsService.groups$.subscribe(groups => {
      this.groupList.set(groups);
      this.updateFilteredGroups();
    });


  }
 
  ngOnDestroy() {
    // Sprzątamy subskrypcje przy zniszczeniu komponentu
    this.newMessageSubscription?.unsubscribe();
    this.groupsSubscription?.unsubscribe();
  }
 
  // EVENT HANDLING
  newMessageTrigger = input<EventEmitter<MessageOfGroupDTO[]>>();
 
  handleNewMessages(newMessages: MessageOfGroupDTO[]) {
    for(let i = 0; i < newMessages.length; i++) {
      for(let j = 0; j < this.groupList().length; j++) {
        if(this.groupList()[j].id == newMessages[i].groupId){
          this.groupsService.updateLastMessage(
            this.groupList()[j].id, 
            newMessages[i].message.sender.username, 
            newMessages[i].message?.content ?? 'sent file', 
            newMessages[i].message.id
          );
          break;
        }
      }
    }
    this.updateFilteredGroups();
  }
 
  groupsViewEnabled = input(false);
  currentUser = input<UserBasicInfo | null>(null);
 
  // Przechowuje wszystkie grupy
  private groupList: WritableSignal<GroupBasicInfoDTO[]> = signal([]);
 
  // Przechowuje albo prywatne, albo nieprywtne grupy
  protected filteredGroups: WritableSignal<GroupBasicInfoDTO[]> = signal([]);
 
  updateFilteredGroups() {
    if(this.currentUser == null)
      return;
     
    if(this.groupsViewEnabled()) {
      // Ustaw filtrowane grupy na publiczne grupy
      this.filteredGroups.set(this.groupList().filter((group) => !group.isPrivate));
    } else {
      // Ustaw filtrowane grupy na prywatne grupy (2 użytkowników - bezpośrednie wiadomości)
      this.filteredGroups.set(this.groupList().filter((group) => group.isPrivate));
    }
  }
}