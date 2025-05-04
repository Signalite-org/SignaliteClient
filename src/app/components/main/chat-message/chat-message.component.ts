import {Component, ElementRef, input, Input, OnInit, Renderer2, signal, WritableSignal} from '@angular/core';
import {NgOptimizedImage, provideCloudinaryLoader} from '@angular/common';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-chat-message',
  imports: [
    NgOptimizedImage,
    MatIcon,
  ],
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.css',
})
export class ChatMessageComponent implements OnInit {
  @Input() isOwnMessage: boolean = false;

  isInCompactMode = input(false)
  isMessageMerged = input(false)

  userName = input('loading user name...');
  message = input('loading message... ');
  profileImageURL = input("../../../../assets/images/default-user.jpg");

  readonly SUPPORTED_ATTACH_TYPES = new Set(["image/jpg","image/jpeg","image/png","image/gif"]);
  showAttachment: WritableSignal<boolean> = signal(false);

  hasAttachment = input(false) // change to true for testing
  attachmentUrl = input<string | null>(null);
  //attachmentImage = input<string | null>("https://static.wikia.nocookie.net/wiewiorcze-oc/images/1/1c/Bober.jpg/revision/latest?cb=20210504184038&path-prefix=pl"); //uncomment for testing
  attachmentName  = input('loading...');
  attachmentType = input("")
  attachmentSize = input(0);

  date = input('22/02/2023, 21:37');

  constructor(
    private renderer: Renderer2,
    private el: ElementRef
  ) { }


  ngOnInit() {
    this.updateHostLayout();
    if(this.SUPPORTED_ATTACH_TYPES.has(this.attachmentType())) {
      this.showAttachment.set(true);
    }
  }

  private updateHostLayout() {
    const host = this.el.nativeElement; // this is the :host element itself
    const message = this.el.nativeElement.querySelector('.message');

    if (this.isOwnMessage) {
      this.renderer.setStyle(host, 'align-self', 'flex-end');
      this.renderer.setStyle(message, 'grid-template-columns', 'auto max-content')
    } else {
      this.renderer.setStyle(host, 'align-self', 'flex-start');
      this.renderer.setStyle(message, 'grid-template-columns', 'max-content auto')
    }
  }
}
