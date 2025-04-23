import {Component, inject, OnInit} from '@angular/core';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {FormsModule} from '@angular/forms';
import {HeroiconService} from '../../../_services/heroicons.service';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';

@Component({
  selector: 'app-group-friends-switch',
  imports: [
    MatIcon,
    FormsModule,
    MatIconModule,
    MatButtonToggleGroup,
    MatButtonToggle
  ],
  templateUrl: './group-friends-switch.component.html',
  styleUrl: './group-friends-switch.component.scss',
  providers: [HeroiconService]
})
export class GroupFriendsSwitchComponent implements OnInit {

  ngOnInit() {
    this.showGroups = "friends";
  }
  showGroups = "friends";

  public onValChange(val: string) {
    this.showGroups = val;
  }
}
