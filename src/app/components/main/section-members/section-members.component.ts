import { Component } from '@angular/core';
import {CardMemberComponent} from '../card-member/card-member.component';
import {FriendsService} from '../../../_services/friends.service';

@Component({
  selector: 'app-section-members',
  imports: [
    CardMemberComponent
  ],
  templateUrl: './section-members.component.html',
  styleUrl: './section-members.component.css'
})
export class SectionMembersComponent {

}
