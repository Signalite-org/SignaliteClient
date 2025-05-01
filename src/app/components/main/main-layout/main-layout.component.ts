import {
  Component,
  Renderer2,
  ElementRef,
  OnInit,
  OnDestroy,
  signal,
  WritableSignal, numberAttribute,
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
import {Observable} from 'rxjs';
import {
  DialogAddFriendCreateGroupComponent
} from '../dialog-add-friend-create-group/dialog-add-friend-create-group.component';

enum ChatLayoutStyle {
  ALL_VISIBLE,
  RIGHT_HIDDEN,
  CENTER_ONLY
}

@Component({
  selector: 'app-main-layout',
  imports: [NavigationFriendsGroups, HeaderGroupFriend, SectionNotifications, SectionGroupFriends, CardCurrentUserComponent, BarMessageSendComponent, SectionChatComponent, SectionMembersComponent, DialogAddFriendCreateGroupComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit, OnDestroy {

  constructor(
    private renderer: Renderer2,
    private el: ElementRef,
    private accountService: AccountService,
    private userService: UserService
  ) {
    this.userId.set(this.accountService.currentUser()?.userId ?? -1);
  }

  ngOnInit() {
    this.userInfo$ = this.userService.getUserInfo(this.userId());
    this.userInfo$.subscribe( info => {
          this.userInfo.set(info);
          this.fullName.set(`${info.username} (${info.name} ${info.surname})`);
          this.currentUserProfileImageURL.set(info.profilePhotoUrl ?? "../../../../assets/images/default-user.jpg")
      }
    )
    this.setupResizeListener();
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private userInfo$!: Observable<UserDTO>;

  //////////////////
  // DATA BINDING //
  //////////////////

  protected userInfo : WritableSignal<UserDTO | null> = signal(null);
  protected userId : WritableSignal<number> = signal(-1);
  protected fullName : WritableSignal<string> = signal("");
  protected currentUserProfileImageURL : WritableSignal<string>  = signal("../../../../assets/images/default-user.jpg");
  protected isGroupsViewEnabled : WritableSignal<boolean> = signal(false);

  /////////////////////
  // LAYOUT HANDLING //
  /////////////////////

  hideRightColumn = signal(false);
  hideLeftColumn= signal(false);
  private resizeObserver: ResizeObserver | null = null;
  private testSwitch: number = -1;
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
      this.renderer.setStyle(content, 'grid-template-columns', 'max-content minmax(0, 1fr) 15%');
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

  protected readonly ChatLayoutStyle = ChatLayoutStyle;
}
