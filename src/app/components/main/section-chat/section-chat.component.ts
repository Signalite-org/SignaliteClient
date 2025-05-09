import {
  AfterViewInit,
  Component,
  effect,
  ElementRef, EventEmitter,
  input, Output,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {ChatMessageComponent} from '../chat-message/chat-message.component';
import {GroupService} from '../../../_services/group.service';
import {MessageService} from '../../../_services/message.service';
import {MessageDTO} from '../../../_models/MessageDTO';
import {PaginationQuery} from '../../../_models/PaginationQuery';
import {AccountService} from '../../../_services/account.service';
import {Subscription} from 'rxjs';
import {DialogEditMessageComponent} from '../dialog-edit-message/dialog-edit-message.component';
import {MessageEdit} from '../../../_models/MessageEdit';
import {MessageOfGroupDTO} from '../../../_models/MessageOfGroupDTO';

@Component({
  selector: 'app-section-chat',
  imports: [
    ChatMessageComponent,
    DialogEditMessageComponent
  ],
  templateUrl: './section-chat.component.html',
  styleUrl: './section-chat.component.css'
})
export class SectionChatComponent implements AfterViewInit {

  /*
  TODO update last messages when removing
  */
  @Output() onMessageModified = new EventEmitter<MessageOfGroupDTO>();

  readonly MAX_CACHED_MESSAGES: number = 20;

  currentGroup = input(-1)
  currentUserId: WritableSignal<number> = signal(-1);

  cachedMessages: WritableSignal<MessageDTO[]> = signal([]);

  ////////////
  // EVENTS //
  ////////////

  newMessageTrigger = input<EventEmitter<MessageDTO>>();
  private newMessageSubscription?: Subscription;

  deleteMessageTrigger = input<EventEmitter<number>>();
  private deleteMessageSubscription?: Subscription;

  editMessageTrigger = input<EventEmitter<MessageEdit>>();
  private editMessageSubscription?: Subscription;

  ////////////////
  // PAGINATION //
  ////////////////

  currentPage: WritableSignal<number> = signal(1);
  totalPages: WritableSignal<number> = signal(0);
  reachedLastPage: WritableSignal<boolean> = signal(true);
  reachedFirstPage: WritableSignal<boolean> = signal(true);
  isTopMessageInSet: WritableSignal<boolean> = signal(true);
  topMessageId: WritableSignal<number> = signal(0);

  // this is used to track for which page the message belongs to
  // messageId -> pageNumber
  private messagePageMap = new Map<number, number>();

  // API call to get new number of totalPages
  private updateTotalPages(){
    this.messageService.getMessageThread(this.currentGroup()).subscribe( thread => {
      this.totalPages.set(thread.totalPages);
      this.reachedLastPage.set(1 == this.totalPages());
      this.reachedFirstPage.set(this.isTopMessageInSet() || thread.items.length == 0);
    });
  }

  /////////////////
  // CONSTRUCTOR //
  /////////////////

  groupService : GroupService;
  messageService : MessageService;

  constructor(
    groupService: GroupService,
    messageService: MessageService,
    accountService: AccountService,
  ) {
    this.groupService = groupService;
    this.messageService = messageService;

    this.currentUserId.set(accountService.currentUser()?.userId ?? -1);

    effect(() => {
      const group = this.currentGroup();

      if (group > 0) {
        this.loadMessagesLatest();
      }
      else {
        this.cachedMessages.set([])
      }
    });

    // LIVE EVENTS

    effect(() => {
      const emitter = this.newMessageTrigger();

      // Unsubscribe from the previous emitter (if any)
      this.newMessageSubscription?.unsubscribe();

      // Subscribe to the new one
      if (emitter) {
        this.newMessageSubscription = emitter.subscribe((message: MessageDTO) => {
          this.handleNewMessage(message);
        });
      }
    });

    effect(() => {
      const emitter = this.deleteMessageTrigger();

      // Unsubscribe from the previous emitter (if any)
      this.deleteMessageSubscription?.unsubscribe();

      // Subscribe to the new one
      if (emitter) {
        this.deleteMessageSubscription = emitter.subscribe((messageId: number) => {
          this.deleteMessage(messageId);
        });
      }
    });

    effect(() => {
      const emitter = this.editMessageTrigger();
      this.editMessageSubscription?.unsubscribe();
      if (emitter) {
        this.editMessageSubscription = emitter.subscribe((edit: MessageEdit) => {
          this.editMessage(edit.content, edit.messageId);
        })
      }
    });
  }

  ngAfterViewInit() {
    const container = this.scrollContainer.nativeElement;
    this.checkScrollVisibility(container);

    new ResizeObserver(() => {
      this.checkScrollVisibility(container);
    }).observe(container);
  }

  // DELETING MESSAGES
  async deleteMessage(messageId: number, localOnly: boolean = true) {

    if(!localOnly) {
      this.updateTotalPages();
    }

    if(messageId < 1) {
      return;
    }

    // Refresh cache
    this.cachedMessages.update(messages => {
        return messages.filter(message => message.id !== messageId);
      }
    );

    // is deleting top message
    if(messageId == this.topMessageId()) {
      await this.getNewTopMessageId(localOnly);
    }

    this.isTopMessageInSet.set(
      this.cachedMessages()
        .filter(message=> message.id == this.topMessageId() ).length == 1);

    // TODO update last message in section group-friends

    // Top message id == -1 when there are now 0 messages
    //     in the whole conversation
    if(this.topMessageId() == -1) {
      this.cachedMessages.set([]);
      this.isTopMessageInSet.set(true);
      this.reachedFirstPage.set(true);
    }

    // Deleted all messages in cache
    // There is no way to check what was the previous page
    if(this.topMessageId() != -1 && this.cachedMessages().length == 0) {
      this.loadMessagesLatest();
    }

    if(localOnly) {
      return;
    }

    this.messageService.deleteMessage(messageId).subscribe();
    this.updateTotalPages();
  }

  async getNewTopMessageId(localOnly: boolean):Promise<void> {
    return new Promise(resolve => {
      const paginationQuery: PaginationQuery = { pageNumber: 1 };

      // try to find new top message
      this.messageService.getMessageThread(this.currentGroup(), paginationQuery)
        .subscribe(thread => {

          // NOTIFICATION that we should delete the message
          // Message has already been deleted from db
          if(localOnly) {
            if(thread.items.length == 0) {
              this.topMessageId.set(-1);
            } else {
              this.topMessageId.set(thread.items[0].id);
            }
          }

          // WE ARE deleting the message
          // Message has not yet been deleted from db
          else {
            if(thread.items.length <= 1) {
              this.topMessageId.set(-1);
            } else {
              this.topMessageId.set(thread.items[1].id);
            }
          }

          if(this.cachedMessages.length != 0) {
            this.reachedFirstPage.set(this.topMessageId() == this.cachedMessages()[0].id);
          }

          return resolve();
        });
    });
  }

  // MODIFYING MESSAGES
  showModifyMessageDialog: WritableSignal<boolean> = signal(false);
  messageToModify: WritableSignal<null | MessageDTO> = signal(null);

  editMessage(messageText: string, messageId: number, localOnly: boolean = true) {
    if(messageId < 1) {
      return;
    }

    const trimmedText = messageText.trim();
    const index = this.cachedMessages().findIndex(message => message.id == messageId);
    let modifiedMessage: MessageDTO | undefined;

    if(index > -1) {
      this.cachedMessages.update(messages => {
        messages[index].content = trimmedText;
        messages[index].lastModification = this.formatDateTime(this.getFormattedCurrentDate());
        modifiedMessage = messages[index];
        return messages;
      })
    }

    if(localOnly || trimmedText === "") {
      return;
    }

    this.messageService.modifyMessage(messageId, messageText).subscribe();

    if(modifiedMessage) {
      const messageOfGroup: MessageOfGroupDTO = {
        groupId: this.currentGroup(),
        message: modifiedMessage
      }
      this.onMessageModified.emit(messageOfGroup);
    }

  }

  ///////////////////////
  // FETCHING MESSAGES //
  ///////////////////////

  handleNewMessage(message: MessageDTO) {

    // Scroll back to top if current user sent message
    //          - and is viewing old history
    if(message.sender.id == this.currentUserId() && !this.isTopMessageInSet()) {
      this.loadMessagesLatest();
      const scrollContainer = this.scrollContainer.nativeElement as HTMLElement;
      scrollContainer.scrollTop = 0;
      return;
    }

    // Make sure to prepend message only if the newest message is visible
    // Don't prepend message when user is viewing old history
    //      - it will be fetched by the API when reaching first page
    if(this.isTopMessageInSet() || this.cachedMessages().length == 0) {
      this.cachedMessages.set(this.prepend(message, this.cachedMessages()));

      // Don't exceed max cache size
      if(this.cachedMessages().length > this.MAX_CACHED_MESSAGES) {
        this.cachedMessages.update(messages =>
          {
            const message = messages.pop();
            if(message && message.id == this.topMessageId()) {
              this.isTopMessageInSet.set(false);
            }
            return messages;
          }
        );
      }
    }

    this.topMessageId.set(message.id);
    this.updateTotalPages();
  }

  loadMessagesLatest() {

    if(this.isGroupInvalid()) {
      return;
    }

    this.isTopMessageInSet.set(true);
    this.currentPage.set(1);
    this.messageService.getMessageThread(this.currentGroup()).subscribe( thread => {
      this.totalPages.set(thread.totalPages);
      this.cachedMessages.set(thread.items);
      this.cachedMessages().forEach(msg => this.messagePageMap.set(msg.id, 1));
      this.reachedLastPage.set(1 == this.totalPages());
      if(thread.items.length != 0) {
        this.topMessageId.set(thread.items[0].id);
      }
    })
    setTimeout(() => {
      this.checkScrollVisibility(this.scrollContainer.nativeElement);
    }, 50);
  }


  async loadNextPage() {
    if (this.isGroupInvalid() || this.reachedLastPage() || this.cachedMessages().length == 0) return;

    let lastMsg = this.cachedMessages()[this.cachedMessages().length - 1];

    // Keep scrolling position after fetching messages
    const scrollContainer = this.scrollContainer.nativeElement as HTMLElement;

    this.currentPage.set(this.messagePageMap.get(lastMsg.id) ?? 1);

    /*
     ! The next page might at this point not exist anymore !
     Next page won't be there if enough messages were deleted
     and drastically changed pagination.
    */
    if(this.currentPage() > this.totalPages()) {
      this.reachedLastPage.set(true);
      return;
    }

    let hasNew = await this.loadMessagesFromPage(this.currentPage(), true);

    // fetch next pages as long as there are no new messages in cache
    while (!hasNew && this.currentPage() < this.totalPages()) {
      lastMsg = this.cachedMessages()[this.cachedMessages().length - 1];

      this.currentPage.update(p => p + 1);
      hasNew = await this.loadMessagesFromPage(this.currentPage(), true);
    }

    this.reachedFirstPage.set(this.isTopMessageInSet());
    this.reachedLastPage.set(this.currentPage() == this.totalPages());

    // Wait a tick to ensure DOM updates
    setTimeout(() => {
      const updatedElement = scrollContainer.querySelector(`[data-msg-id="${lastMsg.id}"]`) as HTMLElement;
      scrollContainer.scrollTop = updatedElement?.offsetTop ?? 0;
    });
  }


  async loadPreviousPage() {
    if (this.isGroupInvalid() || this.reachedFirstPage() || this.cachedMessages().length == 0) return;

    let firstMsg = this.cachedMessages()[0];

    // Keep scrolling position after fetching messages
    const scrollContainer = this.scrollContainer.nativeElement as HTMLElement;

    this.currentPage.set(this.messagePageMap.get(firstMsg.id) ?? 1);

    /*
     ! The previous page might at this point not exist anymore !
     Previous page won't be there if enough messages were deleted
     and drastically changed pagination.
    */
    while(this.currentPage() > this.totalPages() && this.currentPage() > 2) {
      this.currentPage.update(page => page - 1);
    }

    let hasNew = await this.loadMessagesFromPage(this.currentPage(), false);

    // Fetch next pages as long as there are no new messages in cache
    while (!hasNew && this.currentPage() != 1) {
      firstMsg = this.cachedMessages()[0];

      this.currentPage.update(p => p - 1);
      hasNew = await this.loadMessagesFromPage(this.currentPage(), false);
    }

    this.reachedLastPage.set(this.currentPage() == this.totalPages());
    this.reachedFirstPage.set(this.currentPage() == 1);

    // Wait a tick to ensure DOM updates
    setTimeout(() => {
      const updatedElement = scrollContainer.querySelector(`[data-msg-id="${firstMsg.id}"]`) as HTMLElement;
      scrollContainer.scrollTop = updatedElement?.offsetTop ?? 0;
    });
  }

  // Returns true if new messages NOT present in cache were fetched, otherwise false
  // Set isNextPage = false when paging <--, default is true when paging -->
  loadMessagesFromPage(page: number, isNextPage: boolean = true): Promise<boolean> {
    return new Promise((resolve) => {

      // used to check if all new messages are already loaded in cache
      let hasAnyUnstoredMessages = false;

      const paginationQuery: PaginationQuery = { pageNumber: page };

      this.messageService.getMessageThread(this.currentGroup(), paginationQuery)
        .subscribe(thread => {

          // --- Code ensures no duplicates of messages --- //
          // Duplicates may occur when new messages pushed
          //      older messages that were already in cache
          //      to next pages

          const messageMap = new Map<number, MessageDTO>();

          // Paging --> (append messages)
          if (isNextPage) {
            this.cachedMessages().forEach(msg => messageMap.set(msg.id, msg));

            thread.items.forEach(msg => {

              // check if any completely new message has been fetched
              if (!hasAnyUnstoredMessages && !messageMap.has(msg.id)) {
                hasAnyUnstoredMessages = true;
              }

              messageMap.set(msg.id, msg);

              // keep track for which page the message belongs to
              this.messagePageMap.set(msg.id, page);
            });
          }

          // Paging <-- (prepend messages)
          else {

            // used to check if all new messages are already loaded in cache
            // but don't modify the original messageMap
            const testPresence = new Set<number>(this.cachedMessages().map(msg => msg.id));

            thread.items.forEach(msg => {

              // check if any completely new message has been fetched
              if (!hasAnyUnstoredMessages && !testPresence.has(msg.id)) {
                hasAnyUnstoredMessages = true;
              }

              messageMap.set(msg.id, msg);

              // keep track for which page the message belongs to
              this.messagePageMap.set(msg.id, page);
            });

            this.cachedMessages().forEach(msg => {
              messageMap.set(msg.id, msg);
            });
          }

          this.cachedMessages.set(
            isNextPage
              ? Array.from(messageMap.values()).slice(-this.MAX_CACHED_MESSAGES)
              : Array.from(messageMap.values()).slice(0, this.MAX_CACHED_MESSAGES)
          );

          // check if cache is reaching the newest message
          this.isTopMessageInSet.set(
            this.cachedMessages()
              .filter(message=> message.id == this.topMessageId() ).length == 1
          );

          resolve(hasAnyUnstoredMessages);
        });
    });
  }

  isGroupInvalid(): boolean {
    return this.currentGroup() < 1;
  }

  /////////////
  // UTILITY //
  /////////////

  formatDateTime(input: string): string {
    const date = new Date(input);

    if (isNaN(date.getTime())) return 'Invalid date';

    // Format: May 1, 2025, 14:53
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  private scrollDebounceTimeout: any = null;
  private readonly debounceDelay = 200; // ms
  protected directionOlderMessages: WritableSignal<boolean> = signal(true);
  protected isScrollVisible  = signal(true);


  checkScrollVisibility(container: HTMLElement): void {
    this.isScrollVisible.set(container.scrollHeight > container.clientHeight);
  }


  onScroll(): void {
    if (this.scrollDebounceTimeout) {
      clearTimeout(this.scrollDebounceTimeout);
    }

    this.scrollDebounceTimeout = setTimeout(() => {
      const container = this.scrollContainer.nativeElement;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      const atTop = scrollHeight + scrollTop - clientHeight <= 3;
      const atBottom = scrollTop >= -3;

      if (this.directionOlderMessages() && atTop && !this.reachedLastPage()) {
        this.loadNextPage(); // Scrolling up → older messages
      }


      if (!this.directionOlderMessages() && atBottom && !this.reachedFirstPage()) {
        this.loadPreviousPage(); // Scrolling down → newer messages
      }

      this.scrollDebounceTimeout = null;
    }, this.debounceDelay);
  }

  prepend(value:MessageDTO, array:MessageDTO[]) {
    var newArray = array.slice();
    newArray.unshift(value);
    return newArray;
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
