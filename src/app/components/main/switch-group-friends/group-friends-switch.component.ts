import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { IconRegistrator } from '../../../_utils/icon-registrator.service';
import { SearchResetService } from '../../../_utils/search-reset.service';

@Component({
  selector: 'app-group-friends-switch',
  imports: [
    MatIcon,
    FormsModule,
    MatIconModule
  ],
  templateUrl: './group-friends-switch.component.html',
  styleUrl: './group-friends-switch.component.scss',
  providers: [IconRegistrator]
})
export class GroupFriendsSwitchComponent implements OnInit {
  @Output() isGroupsTabEvent = new EventEmitter<boolean>();
  isInGroupView = false;
  
  constructor(private searchResetService: SearchResetService) {}
  
  ngOnInit() {
    this.showGroups = "friends";
  }
  
  showGroups = "friends";
  
  public onValChange(val: boolean) {
    this.isInGroupView = val;
    this.isGroupsTabEvent.emit(val);
    
    // Wywołaj reset pola wyszukiwania za pośrednictwem serwisu
    this.searchResetService.triggerReset();
  }
}