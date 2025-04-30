import {Component, Input} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-user-card',
  imports: [NgOptimizedImage],
  templateUrl: './card-friend.component.html',
  styleUrl: './card-friend.component.css'
})
export class CardFriendComponent {
  @Input() userName:string = "loading...";
  @Input() lastMessage:string = "no last messages";
  @Input() profileImageURL:string = "../../../../assets/images/default-user.jpg";
}
