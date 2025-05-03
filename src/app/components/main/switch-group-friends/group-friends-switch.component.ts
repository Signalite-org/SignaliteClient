import {Component, EventEmitter, inject, OnInit, Output} from '@angular/core';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {FormsModule} from '@angular/forms';
import {IconRegistrator} from '../../../_utils/icon-registrator.service';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';
import {GroupFriendsLayoutComponent} from '../section-group-friends/group-friends-layout.component';

@Component({
  selector: 'app-group-friends-switch',
  imports: [
    MatIcon,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './group-friends-switch.component.html',
  styleUrl: './group-friends-switch.component.scss',
  providers: [IconRegistrator]
})
export class GroupFriendsSwitchComponent implements OnInit {

  @Output() isGroupsTabEvent = new EventEmitter<boolean>();
  isInGroupView = false;

  ngOnInit() {
    this.showGroups = "friends";
  }
  showGroups = "friends";

  public onValChange(val: boolean) {
    this.isInGroupView = val;
    this.isGroupsTabEvent.emit(val);
  }
}
