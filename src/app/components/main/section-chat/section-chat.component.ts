import { Component } from '@angular/core';
import {ChatMessageComponent} from '../chat-message/chat-message.component';

@Component({
  selector: 'app-section-chat',
  imports: [
    ChatMessageComponent
  ],
  templateUrl: './section-chat.component.html',
  styleUrl: './section-chat.component.css'
})
export class SectionChatComponent {

}
