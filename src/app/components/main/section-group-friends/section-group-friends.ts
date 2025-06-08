import {Component, input, signal, WritableSignal, effect, Output, EventEmitter, OnInit, OnDestroy, output} from '@angular/core';
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
import {MessageDelete} from '../../../_models/MessageDelete';
import { UserService } from '../../../_services/user.service';

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
  private editMessageSubscription?: Subscription;
  private deleteMessageSubscription?: Subscription;

  // CONSTRUCTOR
  constructor(private groupsService: GroupService, private notificationService: NotificationsService, private toastr: ToastrService) {

    // Ten efekt odpowiada za zaladowanie w dobre miejsce grup (prywatne/wieloosobowe) do opdowiednich tabów
    effect(() => {
      this.updateFilteredGroups();
    })

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

    effect(() => {
      const emitter = this.editMessageTrigger();
      this.editMessageSubscription?.unsubscribe();
      if (emitter) {
        this.editMessageSubscription = emitter.subscribe((messages: MessageOfGroupDTO[]) => {
          this.handleEditedMessages(messages);
        })
      }
    })

    effect(() => {
      const emitter = this.deleteMessageTrigger();
      this.deleteMessageSubscription?.unsubscribe();
      if (emitter) {
        this.deleteMessageSubscription = emitter.subscribe((messages: MessageDelete[]) => {
          this.handleDeletedMessages(messages);
        })
      }
    });

    // Effect for added to group notifications
    effect(() => {
        const addedToGroup = this.notificationService.addedToGroup();
        if (addedToGroup.id > 0) {
          this.toastr.info("You've been added to a new group!");
          this.notificationService.clearAddedToGroup();
        }
    });


    effect(() => {
      const deletedGroupId = this.notificationService.deletedGroup()
      if (deletedGroupId > 0) {
        this.groupDeleted.emit(deletedGroupId)
        this.toastr.info('Group has been deleted!');
        this.notificationService.clearDeletedGroup();
      }
    });

    effect(() => {
      const updatedGroup = this.notificationService.groupUpdated()
      if (updatedGroup.id > 0) {
        this.groupUpdated.emit(updatedGroup.id)
        this.toastr.info('Group has been updated!');
        this.notificationService.clearUpdatedGroup();
      }
    });

    effect(() => {
      const newFriend = this.notificationService.friendRequestsAccepted()
      if (newFriend) {
        this.toastr.info(`${newFriend.name} has accepted your friend request`);
        this.notificationService.clearFriendRequestAccepted()
      }
    });

    effect(() => {
      const deletedUser = this.notificationService.userDeletedFromGroup()
      console.log(deletedUser?.userId)
      if (deletedUser) {

        if (this.currentUser()?.id === deletedUser.userId) {
          this.groupsService.fetchGroups()
          toastr.info("You have been deleted from group")
          this.groupDeleted.emit(deletedUser.groupId)
        }
        else {
          this.groupsService.getGroupMembers(deletedUser.groupId)
          toastr.info("User has been removed from group")
        }
        this.notificationService.clearUserDeletedFromGroup();
      }
    });
}

  ngOnInit() {
      //this.groupList.set(this.groupsService.groups());
      this.updateFilteredGroups();
  }

  ngOnDestroy() {
    // Sprzątamy subskrypcje przy zniszczeniu komponentu
    this.newMessageSubscription?.unsubscribe();
    //this.groupsSubscription?.unsubscribe();
  }

  // EVENT HANDLING
  newMessageTrigger = input<EventEmitter<MessageOfGroupDTO[]>>();
  editMessageTrigger=input<EventEmitter<MessageOfGroupDTO[]>>();
  deleteMessageTrigger=input<EventEmitter<MessageDelete[]>>();

  handleNewMessages(newMessages: MessageOfGroupDTO[]) {
    for(let i = 0; i < newMessages.length; i++) {
      for(let j = 0; j < this.groupsService.groups().length; j++) {
        if(this.groupsService.groups()[j].id == newMessages[i].groupId){
          const groupId = this.groupsService.groups()[j].id
          this.groupsService.moveGroupToTop(groupId)
          this.groupsService.updateLastMessage(
            groupId,
            newMessages[i].message.sender.username,
            newMessages[i].message?.content ?? 'sent file',
            newMessages[i].message.id
          );
          this.updateFilteredGroups()
          break;
        }
      }
    }
  }

  handleEditedMessages(messages: MessageOfGroupDTO[]) {
    for(let i = 0; i < messages.length; i++) {

      if(!messages[i].isLast) {
        continue;
      }

      for(let j = 0; j < this.groupsService.groups().length; j++) {
        if(this.groupsService.groups()[j].id == messages[i].groupId){
          this.groupsService.updateLastMessage(
            messages[i].groupId,
            messages[i].message.sender.username,
            messages[i].message?.content ?? 'sent file',
            messages[i].message.id
          );
          this.updateFilteredGroups()
          break;
        }
      }
    }
  }

  handleDeletedMessages(messages: MessageDelete[]) {
    for(let i = 0; i < messages.length; i++) {
      for(let j = 0; j < this.groupsService.groups().length; j++) {
        if(this.groupsService.groups()[j].id == messages[i].groupId){
          this.groupsService.updateLastMessage(
            messages[i].groupId,
            messages[i].lastMessage?.sender.username ?? '',
            messages[i].lastMessage == undefined ? 'no last messages' : messages[i].lastMessage?.content ?? 'sent file',
            messages[i].lastMessage?.id ?? -1
          );
          this.updateFilteredGroups()
          break;
        }
      }
    }
  }

  groupsViewEnabled = input(false);
  currentUser = input<UserBasicInfo | null>(null);

  groupDeleted = output<number>()
  groupUpdated = output<number>()

  // Przechowuje wszystkie grupy
  //private groupList: WritableSignal<GroupBasicInfoDTO[]> = signal([]);

  // Przechowuje albo prywatne, albo nieprywtne grupy
  protected filteredGroups: WritableSignal<GroupBasicInfoDTO[]> = signal([]);

  updateFilteredGroups() {
    if(this.currentUser == null)
      return;

    if(this.groupsViewEnabled()) {
      // Ustaw filtrowane grupy na publiczne grupy
      this.filteredGroups.set(this.groupsService.groups().filter((group) => !group.isPrivate));
    } else {
      // Ustaw filtrowane grupy na prywatne grupy (2 użytkowników - bezpośrednie wiadomości)
      this.filteredGroups.set(this.groupsService.groups().filter((group) => group.isPrivate));
    }
  }

  handleSearchTextChange(text: string) {
    if (this.groupsViewEnabled()) {
      this.filteredGroups.set(this.groupsService.groups().filter((group) => group.name.includes(text) && !group.isPrivate))
    }
    else {
      this.filteredGroups.set(this.groupsService.groups().filter((group) => group.name.includes(text) && group.isPrivate))
    }
  }
}
