import {
  Component,
  Renderer2,
  ElementRef,
  OnInit,
  OnDestroy,
  signal,
  WritableSignal, EventEmitter, Output,
  effect,
  DestroyRef,
  inject,
} from '@angular/core';
import { NavigationFriendsGroups } from '../navigation-friends-groups/navigation-friends-groups';
import { HeaderGroupFriend } from '../header-group-friend/header-group-friend';
import { SectionNotifications } from '../section-notifications/section-notifications';
import { SectionGroupFriends } from '../section-group-friends/section-group-friends';
import {CardCurrentUserComponent} from '../card-current-user/card-current-user.component';
import {BarMessageSendComponent} from '../bar-message-send/bar-message-send.component';
import {SectionChatComponent} from '../section-chat/section-chat.component';
import {SectionMembersComponent} from '../section-members/section-members.component';
import {AccountService} from '../../../_services/account.service';
import {UserService} from '../../../_services/user.service';
import {UserDTO} from '../../../_models/UserDTO';
import {Observable, Subscription} from 'rxjs';
import {NotificationsService} from '../../../_services/notifications.service';
import {MessageDTO} from '../../../_models/MessageDTO';
import {MessageOfGroupDTO} from '../../../_models/MessageOfGroupDTO';
import {NgOptimizedImage} from '@angular/common';
import {MessageEdit} from '../../../_models/MessageEdit';
import {MessageDelete} from '../../../_models/MessageDelete';
import { ToastrService } from 'ngx-toastr';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OwnUserDTO } from '../../../_models/OwnUserDTO';
import { CallManagerComponent } from '../../call/call-manager/call-manager.component';
import { WebRtcService } from '../../../_services/webrtc.service';

enum ChatLayoutStyle {
  ALL_VISIBLE,
  RIGHT_HIDDEN,
  CENTER_ONLY
}

@Component({
  selector: 'app-main-layout',
  imports: [NavigationFriendsGroups, HeaderGroupFriend, SectionNotifications, SectionGroupFriends, CardCurrentUserComponent, BarMessageSendComponent, SectionChatComponent, SectionMembersComponent, NgOptimizedImage, RouterModule, CallManagerComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit, OnDestroy {

  private lastProcessedMessagesLength = 0;
  private subscriptions: Subscription[] = [];
  private destroyRef = inject(DestroyRef);
  private effectRef: ReturnType<typeof effect> | null = null;

  constructor(
    private renderer: Renderer2,
    private el: ElementRef,
    private accountService: AccountService,
    private userService: UserService,
    private notificationsService: NotificationsService,
    private router: Router,
    private webRtcService: WebRtcService,
    private toastr: ToastrService
  ){
    this.userId.set(this.accountService.currentUser()?.userId ?? -1);

    this.effectRef = effect(() => {
      const messages = this.notificationsService.messagesReceived();

      // Only process if there are new messages
      if (messages.length > 0 && messages.length > this.lastProcessedMessagesLength) {
        // Process all the messages
        for (let i = 0; i < messages.length; i++) {
          if (messages[i].groupId == this.currentGroupId()) {
            this.triggerNewMessageForCurrentGroup.emit(messages[i].message);
          }
        }

        // Emit all messages for global handling
        this.triggerNewMessagesForAllGroups.emit(messages);

        // Clear the messages from notifications service
        this.notificationsService.clearReceivedMessages();

        // Update our processed length
        this.lastProcessedMessagesLength = 0; // Reset to 0 since we cleared the messages
      }
    });
  }

  get ownUser() {
    return this.userService.ownUser();
  }

  ngOnInit() {
    this.userService.refreshOwnUser().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(info => {
      this.fullName.set(`${info.username} (${info.name} ${info.surname})`);
      this.currentUserProfileImageURL.set(info.profilePhotoUrl ?? "../../../../assets/images/default-user.jpg");
    });

    // Use takeUntilDestroyed to automatically unsubscribe when component is destroyed
    
    this.setupResizeListener();

    //////////////////////////
    // SETUP OF LIVE EVENTS //
    //////////////////////////

    // On messages deleted
    this.subscriptions.push(
      this.notificationsService.messageDeleted$.subscribe(messages => {
        for(let i = 0; i < messages.length; i++) {
          if(messages[i].groupId == this.currentGroupId()) {
            this.triggerDeletedMessageForCurrentGroup.emit(messages[i].messageId);
          }
        }
        this.triggerDeletedMessagesForAllGroups.emit(messages);
        this.notificationsService.clearDeletedMessages();
      })
    );

    // On message edited
    this.subscriptions.push(
      this.notificationsService.messageModified$.subscribe(messages => {
        for(let i = 0; i < messages.length; i++) {
          if(messages[i].groupId == this.currentGroupId()) {
            const modifiedMessage : MessageEdit = {
              messageId: messages[i].message.id,
              content: messages[i].message.content ?? ''
            }
            this.triggerEditMessageForCurrentGroup.emit(modifiedMessage);
          }
        }
        this.triggerEditMessagesForAllGroups.emit(messages);
        this.notificationsService.clearModifiedMessages();
      })
    );

    setTimeout(() => {
      this.checkDevicesIfNeeded();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Clean up the effect - Angular should handle this through DestroyRef,
    // but adding explicit cleanup for safety
    if (this.effectRef) {
      // Effect cleanup is handled by Angular's destroy hook
      // No manual cleanup needed when using the inject(DestroyRef) pattern
    }
  }

  //////////////////
  // DATA BINDING //
  //////////////////

  // NOTIFICATIONS - EVENTS
  @Output() triggerNewMessageForCurrentGroup = new EventEmitter<MessageDTO>();
  @Output() triggerNewMessagesForAllGroups = new EventEmitter<MessageOfGroupDTO[]>();
  @Output() triggerDeletedMessageForCurrentGroup = new EventEmitter<number>();
  @Output() triggerDeletedMessagesForAllGroups = new EventEmitter<MessageDelete[]>();
  @Output() triggerEditMessageForCurrentGroup = new EventEmitter<MessageEdit>();
  @Output() triggerEditMessagesForAllGroups = new EventEmitter<MessageOfGroupDTO[]>();

  protected userId : WritableSignal<number> = signal(-1);
  protected fullName : WritableSignal<string> = signal("");
  protected currentUserProfileImageURL : WritableSignal<string>  = signal("../../../../assets/images/default-user.jpg");

  protected isGroupsViewEnabled : WritableSignal<boolean> = signal(false);
  protected currentGroupId : WritableSignal<number> = signal(0);

  protected handleGroupDeleted(groupId: number) {
    if (this.currentGroupId() === groupId) {
      this.currentGroupId.set(-1)
    }
  }

  protected handleGroupUpdated(groupId: number) {
    let currentGroupId = this.currentGroupId()
    if (currentGroupId === groupId) {
      this.currentGroupId.set(-1)
      // Ustawiam minimalne opoznienie zeby sie zrefreshowała grupa
      setTimeout(() => {
        this.currentGroupId.set(groupId)
      }, 1);
    }
  }

  protected showProfilePage() {
    this.router.navigateByUrl('/settings')
  }

  /////////////////////
  // LAYOUT HANDLING //
  /////////////////////

  hideRightColumn = signal(false);
  hideLeftColumn= signal(false);
  displayMembersOnTop = signal(false);
  skipStartAnimation = signal(true);

  private resizeObserver: ResizeObserver | null = null;
  protected currentChatLayout:WritableSignal<ChatLayoutStyle> = signal(ChatLayoutStyle.ALL_VISIBLE);

  protected returnToNormalChatLayout() {
    const width:number = this.el.nativeElement.querySelector('#content').offsetWidth;
    console.log(width);
    this.updateLayout();
    if (width < 700) {
      this.layoutRightHidden();
    } else {
      this.layoutAllVisible();
    }
    this.updateLayout();
  }

  private updateLayout() {
    const content = this.el.nativeElement.querySelector('#content');
    if(this.hideLeftColumn() && this.hideRightColumn()){ // only center
      this.renderer.setStyle(content, 'grid-template-columns','100%');
    } else if(this.hideRightColumn()) { // right hidden
      this.renderer.setStyle(content, 'grid-template-columns', 'minmax(6em, 30%) minmax(50%, 1fr)');
    } else { // both visible
      this.renderer.setStyle(content, 'grid-template-columns', 'minmax(6em, 15%) minmax(0, 1fr) 15%');
    }
  }

  private setupResizeListener() {
    this.resizeObserver = new ResizeObserver(entries => {
      if(this.currentChatLayout() == this.ChatLayoutStyle.CENTER_ONLY){
        return;
      }
      for (let entry of entries) {
        const width = entry.contentRect.width;
        if (width < 700) {
          this.layoutRightHidden();
        } else {
          this.layoutAllVisible();
        }
        this.updateLayout();
      }
    });

    this.resizeObserver.observe(document.body); // Observe changes to the body width
  }

  private layoutAllVisible() {
    this.hideRightColumn.set(false);
    this.hideLeftColumn.set(false);
    this.currentChatLayout.set(ChatLayoutStyle.ALL_VISIBLE);
  }

  private layoutRightHidden() {
    this.hideRightColumn.set(true);
    this.hideLeftColumn.set(false);
    this.currentChatLayout.set(ChatLayoutStyle.RIGHT_HIDDEN);
  }

  private layoutCenterOnly() {
    this.hideRightColumn.set(true);
    this.hideLeftColumn.set(true);
    this.currentChatLayout.set(ChatLayoutStyle.CENTER_ONLY);
  }

  switchToFullChatMode(): void {
    if(this.currentChatLayout() == this.ChatLayoutStyle.RIGHT_HIDDEN)
    {
      this.layoutCenterOnly();
      this.updateLayout();
    }
  }

  onUserClickedChat(): void {
    if(this.currentChatLayout() == this.ChatLayoutStyle.RIGHT_HIDDEN) {
      this.switchToFullChatMode();
    }
  }

  private checkDevicesIfNeeded() {
    // Only check if we haven't already
    if (this.webRtcService.audioDevices().length === 0 && this.webRtcService.videoDevices().length === 0) {
      this.webRtcService.checkAvailableDevices().catch(error => {
        console.warn('Initial device check failed:', error);
      });
    }
  }

  protected readonly ChatLayoutStyle = ChatLayoutStyle;
}