import {Component, input, ViewChild, ElementRef, EventEmitter, Output} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MessageService} from '../../../_services/message.service';
import {SendMessageDTO} from '../../../_models/SendMessageDTO';
import {ReactiveFormsModule} from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {MessageDTO} from '../../../_models/MessageDTO';
import {MessageOfGroupDTO} from '../../../_models/MessageOfGroupDTO';
import {UserDTO} from '../../../_models/UserDTO';
import {UserBasicInfo} from '../../../_models/UserBasicInfo';
import {MessagePostResponse} from '../../../_models/MessagePostResponse';
import {AttachmentDTO} from '../../../_models/AttachmentDTO';

@Component({
  selector: 'app-bar-message-send',
  imports: [
    MatIcon,
    ReactiveFormsModule,
  ],
  templateUrl: './bar-message-send.component.html',
  styleUrl: './bar-message-send.component.css'
})
export class BarMessageSendComponent {

  @Output() triggerSentNewMessage = new EventEmitter<MessageDTO>();

  currentUser = input<UserDTO | null>();
  currentGroupId = input(-1);

  selectedFile:File|undefined;

  messageForm: FormGroup;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  constructor(
    private messagesService:MessageService,
    private fb: FormBuilder)
  {
    this.messageForm = this.fb.group({
      message: ['', Validators.required],
    });
  }

  async sendMessage(message:string) {
    if(this.currentGroupId() < 1 || message.trim() == "" || this.currentUser()?.id == undefined
    || this.currentUser() == undefined) {
      return;
    }

    const content = message.trim();
    const groupId = this.currentGroupId();
    const attachment = this.selectedFile

    const sendMessageDTO:SendMessageDTO = {
      content: content,
      groupId: groupId,
      attachment: attachment
    }

    this.messageForm.reset(); // clear the input
    this.selectedFile = undefined; // clear any selected attachment if needed

    const messagePostResponse = await this.sendMessageToAPI(sendMessageDTO);

    if(messagePostResponse.messageId < 1) {
      return;
    }

    const currentUserBasicInfo: UserBasicInfo = {
      id: this.currentUser()?.id ?? -1,
      username:  this.currentUser()?.username ?? 'Undefined user',
      profilePhotoUrl: this.currentUser()?.profilePhotoUrl ?? undefined,
    }

    let attachmentDTO: AttachmentDTO | undefined;

    if(attachment) {
      attachmentDTO = {
        id: -1,
        name: attachment.name,
        fileSize: attachment.size * 0.000001,
        type: attachment.type,
        url: messagePostResponse.attachmentUrl ?? ""
      }
    }

    const messageDTO: MessageDTO = {
      id: messagePostResponse.messageId,
      content: content,
      lastModification: this.getFormattedCurrentDate(),
      attachment: attachmentDTO,
      sender: currentUserBasicInfo
    }

    this.triggerSentNewMessage.emit(messageDTO);
  }

  sendMessageToAPI(message:SendMessageDTO):Promise<MessagePostResponse> {
    return new Promise((resolve) => {
      this.messagesService.sendMessage(message).subscribe(response =>
        resolve(response)
      );
    })

  }

  triggerFileInput() {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.selectedFile = file;
    }

    // Optional: reset file input to allow re-selection of the same file
    input.value = '';
  }

  getFormattedCurrentDate(): string {
    const now = new Date();

    const pad = (num: number, size: number = 2) => num.toString().padStart(size, '0');

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    const milliseconds = now.getMilliseconds(); // e.g. 475
    const highPrecision = pad(milliseconds, 3) + '0000'; // mock extra digits to match .fffffff

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${highPrecision}`;
  }
}
