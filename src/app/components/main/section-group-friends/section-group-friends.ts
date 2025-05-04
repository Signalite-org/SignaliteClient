import {Component, input, signal, WritableSignal, effect, Output, EventEmitter} from '@angular/core';
import {CardFriendComponent} from '../card-friend/card-friend.component';
import {GroupFriendSearchComponent} from '../search-group-friend/group-friend-search.component';
import {UserBasicInfo} from '../../../_models/UserBasicInfo';
import {GroupBasicInfoDTO} from '../../../_models/GroupBasicInfoDTO';
import {GroupService} from '../../../_services/group.service';
import {MessageDTO} from '../../../_models/MessageDTO';
import {Subscription} from 'rxjs';
import {MessageOfGroupDTO} from '../../../_models/MessageOfGroupDTO';

@Component({
  selector: 'section-group-friends',
  imports: [
    CardFriendComponent,
    GroupFriendSearchComponent,
  ],
  templateUrl: './section-group-friends.html',
  styleUrl: './section-group-friends.css'
})
export class SectionGroupFriends {

  // TODO fetch newly created group by listening to event

  @Output() onGroupFriendClicked = new EventEmitter<number>();

  /////////////////
  // CONSTRUCTOR //
  /////////////////

  constructor(groupsService: GroupService) {
    groupsService.getGroups().subscribe( groups => {
        this.groupList.set(groups);
        this.updateFilteredGroups();
      }
    );
    effect(() => {
      this.updateFilteredGroups();
    });

    // LIVE EVENTS

    effect(() => {
      const emitter = this.newMessageTrigger();

      // Unsubscribe from the previous emitter (if any)
      this.newMessageSubscription?.unsubscribe();

      // Subscribe to the new one
      if (emitter) {
        this.newMessageSubscription = emitter.subscribe((messages: MessageOfGroupDTO[]) => {
          this.handleNewMessages(messages);
        });
      }
    });
  }

  ////////////////////
  // EVENT HANDLING //
  ////////////////////

  newMessageTrigger = input<EventEmitter<MessageOfGroupDTO[]>>();
  private newMessageSubscription?: Subscription;

  handleNewMessages(newMessages: MessageOfGroupDTO[]) {

    for(let i = 0; i < newMessages.length; i++) {
      for(let j = 0; j < this.groupList().length; j++) {
        if(this.groupList()[j].id == newMessages[i].groupId){
          this.groupList.update(groups => {
            groups[j].lastMessage = newMessages[i].message.sender.username + ": " + (newMessages[i].message?.content ?? 'sent file');
            return groups
          })
          break;
        }
      }
    }

    this.updateFilteredGroups();
  }

  ////////////////////

  groupsViewEnabled = input(false);
  currentUser = input<UserBasicInfo | null>(null);

  // stores all groups
  private groupList: WritableSignal<GroupBasicInfoDTO[]> = signal([]);

  // stores either private or not private groups
  protected filteredGroups: WritableSignal<GroupBasicInfoDTO[]> = signal([]);

  updateFilteredGroups() {
    if(this.currentUser ==  null)
      return;

    if(this.groupsViewEnabled()) {
      // set filtered groups to public groups
      this.filteredGroups.set(this.groupList().filter((group) => !group.isPrivate))

    } else {
      // set filtered groups to private groups (2 users - direct friend messages)
      this.filteredGroups.set(this.groupList().filter((group) => group.isPrivate))
    }
  }

}
