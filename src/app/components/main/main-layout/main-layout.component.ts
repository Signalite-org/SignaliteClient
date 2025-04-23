import {Component, Renderer2, ElementRef, OnInit, OnDestroy, signal} from '@angular/core';
import { TopLeftComponent } from './top/top-left/top-left.component';
import { GroupFriendHeaderComponent } from '../header-group-friend/group-friend-header.component';
import { NotificationsLayout } from '../section-notifications/notifications-layout';
import { GroupFriendsLayoutComponent } from '../section-group-friends/group-friends-layout.component';
import {CardCurrentUserComponent} from '../card-current-user/card-current-user.component';
import {BarMessageSendComponent} from '../bar-message-send/bar-message-send.component';
import {SectionChatComponent} from '../section-chat/section-chat.component';
import {SectionMembersComponent} from '../section-members/section-members.component';

@Component({
  selector: 'app-main-layout',
  imports: [TopLeftComponent, GroupFriendHeaderComponent, NotificationsLayout, GroupFriendsLayoutComponent, CardCurrentUserComponent, BarMessageSendComponent, SectionChatComponent, SectionMembersComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  constructor(private renderer: Renderer2, private el: ElementRef) {}

  hideRightColumn = signal(false);
  hideLeftColumn= signal(false);
  private resizeObserver: ResizeObserver | null = null;
  private testSwitch: number = -1;

  ngOnInit() {
    this.setupResizeListener();
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
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

  private switchRightColumn(): void {
    this.hideRightColumn.set(!this.hideRightColumn());
  }

  private layoutAllVisible() {
    this.hideRightColumn.set(false);
    this.hideLeftColumn.set(false);
  }

  private layoutRightHidden() {
    this.hideRightColumn.set(true);
    this.hideLeftColumn.set(false);
  }

  private layoutCenterOnly() {
    this.hideRightColumn.set(true);
    this.hideLeftColumn.set(true);
  }

  testSwitchColumns(): void {
    this.testSwitch = (this.testSwitch + 1) % 2;
    if(this.testSwitch == 0) {
      this.layoutRightHidden();
    } else if(this.testSwitch == 1) {
      this.layoutCenterOnly();
    }
    this.updateLayout();
  }
}
