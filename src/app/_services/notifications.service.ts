import { effect, inject, Injectable, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FriendRequest } from '../_models/FriendRequest';
import { GroupBasicInfoDTO} from '../_models/GroupBasicInfoDTO';
import { FriendRequestAccepted } from '../_models/FriendRequestAccepted';
import { FriendRequestDTO } from '../_models/FriendRequestDTO';
import { UserDTO } from '../_models/UserDTO';
import { MessageDTO } from '../_models/MessageDTO';
import {MessageOfGroupDTO} from '../_models/MessageOfGroupDTO';
import { UserBasicInfo } from '../_models/UserBasicInfo';
import {MessageDelete} from '../_models/MessageDelete';
import { GroupService } from './group.service';
import { UserDeletedFromGroup } from '../_models/UserDeletedFromGroupNot';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  private hubConnection?: HubConnection;
  private hubUrl = environment.hubUrl;
  private handlersRegistered = false;
  private connectionActive = false;
  private reconnectAttemptInProgress = false;

  private defaultGroup: GroupBasicInfoDTO = {id: -1, name: "", photoUrl: "", isPrivate: false}
  private defaultUser: UserBasicInfo = {id: -1, username: "", profilePhotoUrl: ""}

  constructor(private router: Router) {
    console.log('NotificationsService constructed');
    
    // Get AccountService via inject to avoid circular dependency
    const accountService = inject(AccountService);
    
    // Create an effect to monitor the currentUser signal
    effect(() => {
      const user = accountService.currentUser();
      const isRefreshing = accountService.isRefreshingToken();
      
      console.log('NotificationsService detected auth state change, user:', user ? 'exists' : 'null', 
                 'isRefreshing:', isRefreshing);
      
      if (user?.accessToken && !isRefreshing) {
        console.log('NotificationsService: User authenticated, creating hub connection');
        this.createHubConnection(user.accessToken);
      } else if (!user && this.connectionActive) {
        console.log('NotificationsService: User logged out, stopping hub connection');
        this.stopHubConnection();
      }
    });
  }


  // New BehaviorSubjects to track notifications
  private _friendRequest = signal<FriendRequestDTO | null>(null);
  public get friendRequest() {
    return this._friendRequest.asReadonly();
  }

  private _friendRequestAccepted = signal<GroupBasicInfoDTO | null>(null);
  public get friendRequestsAccepted() {
    return this._friendRequestAccepted.asReadonly();
  }

  private _addedToGroup = signal<GroupBasicInfoDTO>(this.defaultGroup);
  public get addedToGroup() {
    return this._addedToGroup.asReadonly();
  }

  private _deletedGroup = signal<number>(-1);
  public get deletedGroup() {
    return this._deletedGroup.asReadonly();
  }

  private _userDeletedFromGroup = signal<UserDeletedFromGroup | null>(null)
  public get userDeletedFromGroup() {
    return this._userDeletedFromGroup.asReadonly()
  }

  private _groupUpdated = signal<GroupBasicInfoDTO>(this.defaultGroup)
  public get groupUpdated() {
    return this._groupUpdated.asReadonly();
  }

  private _messagesReceived = signal<MessageOfGroupDTO[]>([]);
  public get messagesReceived() {
    return this._messagesReceived.asReadonly();
  }

  private _userAddedToGroup = signal<UserBasicInfo>(this.defaultUser);
  public get userAddedToGroup() {
    return this._userAddedToGroup.asReadonly();
  }

  private messagesDeletedSource = new BehaviorSubject<MessageDelete[]>([]);
  messageDeleted$ = this.messagesDeletedSource.asObservable();

  private messagesModifiedSource = new BehaviorSubject<MessageOfGroupDTO[]>([]);
  messageModified$ = this.messagesModifiedSource.asObservable();

  createHubConnection(token: string): Promise<void> {
    if (!token) {
      console.error('No token provided for notifications hub connection');
      return Promise.reject('No token provided');
    }

    // Important: Always recreate the connection when this method is called
    // even if one exists, to ensure we're using the latest token
    if (this.hubConnection) {
      console.log('Stopping existing notifications hub connection before creating a new one');
      this.stopHubConnection();
    }
    
    console.log('Creating notifications hub connection with token:', token.substring(0, 15) + '...');

    // Create the connection
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}/notifications`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    // IMPORTANT: Register handlers BEFORE starting the connection
    this.registerSignalRHandlers();

    // Return the promise from start operation
    return this.retryConnection(token);
  }

  private startHubConnection(): Promise<void> {
    if (!this.hubConnection) {
      return Promise.reject('No hub connection exists');
    }

    return this.hubConnection.start()
      .then(() => {
        console.log('✅ Successfully connected to notifications hub');
        this.connectionActive = true;
      })
      .catch(error => {
        console.error('❌ Error starting notifications hub connection:', error);
        this.connectionActive = false;
        this.handleConnectionError(error);
        throw error;
      });
  }

  private registerSignalRHandlers() {
    if (!this.hubConnection || this.handlersRegistered) return;


    console.log('Registering Notifications SignalR handlers...');

    this.hubConnection.on('FriendRequest', (notification: FriendRequestDTO) => {
      console.log('📬 Received friend request notification:', notification);
      this._friendRequest.set(notification);
    });

    this.hubConnection.on('FriendRequestAccepted', (friend: GroupBasicInfoDTO) => {
      console.log('📬 Received friend request accepted notification:', friend);
      this._friendRequestAccepted.set(friend);
      
    });

    this.hubConnection.on('MessageReceived', (message: MessageOfGroupDTO) => {
      console.log('📬 Received message:', message);
      this._messagesReceived.update(messages => {
        if (!messages.some(msg => msg.message.id === message.message.id)) {
          return [...messages, message];
        }
        return messages;
      });
    });

    this.hubConnection.on('AddedToGroup', (groupInfo: GroupBasicInfoDTO) => {
      console.log('📬 Received AddedToGroup notification:', groupInfo);
      this._addedToGroup.set(groupInfo);
    });

    this.hubConnection.on('UserAddedToGroup', (userInfo: UserBasicInfo) => {
      console.log('📬 Received UserAddedToGroup notification:', userInfo);
      this._userAddedToGroup.set(userInfo);
    });

    this.hubConnection.on('GroupDeleted', (notification: {groupId: number}) => {
      console.log('📬 Received GroupDeleted notification:', notification.groupId);
      this._deletedGroup.set(notification.groupId)
    });

    this.hubConnection.on('GroupUpdated', (groupInfo: GroupBasicInfoDTO) => {
      console.log('📬 Received GroupUpdated notification:', groupInfo);
      this._groupUpdated.set(groupInfo)
    });

    this.hubConnection.on('UserRemovedFromGroup', (notification: {userId: number, groupId: number}) => {
      console.log('📬 Received UserRemovedFromGroup notification:', notification);
      this._userDeletedFromGroup.set(notification)
    });

    this.hubConnection.on('UserUpdated', (notification) => {
      console.log('📬 Received UserUpdated notification:', notification);
    });

    this.hubConnection.on('MessageDeleted', (message: MessageDelete) => { //GroupId, MessageId
      console.log('📬 Received MessageDeleted notification:', message);
      const deletedMessages = this.messagesDeletedSource.value;
      const exists = deletedMessages.some(req => req.messageId === message.messageId);
      if (!exists) {
        this.messagesDeletedSource.next([...deletedMessages, message])
      }
    });

    this.hubConnection.on('MessageModified', (message: MessageOfGroupDTO) => {
      console.log('📬 Received MessageModified notification:', message);
      const modifiedMessages = this.messagesModifiedSource.value;
      const exists = modifiedMessages.some(req => req.message.id === message.message.id);
      if (!exists) {
        this.messagesModifiedSource.next([...modifiedMessages, message])
      }
    });

    this.hubConnection.on('AttachmentRemoved', (notification) => {
      console.log('📬 Received AttachmentRemoved notification:', notification);
    });

    this.hubConnection.onclose((error) => {
      console.log('Notifications hub connection closed', error);
      this.connectionActive = false;
      if (error) {
        this.handleConnectionError(error);
      }
    });

    this.handlersRegistered = true;
    console.log('✅ Notification handlers registered');
  }

  stopHubConnection() {
    if (this.hubConnection) {
      console.log('Stopping notifications hub connection...');
      
      return this.hubConnection.stop()
        .catch(error => console.error('Error stopping notifications hub connection:', error))
        .finally(() => {
          this.hubConnection = undefined;
          this.handlersRegistered = false;
          this.connectionActive = false;
          console.log('Notifications hub connection stopped and reset');
        });
    }
    return Promise.resolve();
  }

  reconnect(token: string) {
    if (this.reconnectAttemptInProgress) {
      console.log('Reconnect attempt already in progress, skipping');
      return;
    }
    
    this.reconnectAttemptInProgress = true;
    
    console.log('Reconnecting notifications hub with new token');
    this.stopHubConnection()
      .then(() => this.createHubConnection(token))
      .finally(() => {
        this.reconnectAttemptInProgress = false;
      });
  }

  clearAddedToGroup() {
    this._addedToGroup.set(this.defaultGroup);
  }

  clearUserAddedToGroup() {
    this._userAddedToGroup.set(this.defaultUser)
  }

  clearReceivedMessages() {
    this._messagesReceived.set([]);
  }

  clearDeletedGroup() {
    this._deletedGroup.set(-1)
  }

  clearUserDeletedFromGroup() {
    this._userDeletedFromGroup.set(null)
  }

  clearUpdatedGroup() {
    this._groupUpdated.set(this.defaultGroup)
  }

  clearFriendRequest() {
    this._friendRequest.set(null);
  }

  clearFriendRequestAccepted() {
    this._friendRequestAccepted.set(null);
  }

  private retryConnection(token: string, maxRetries: number = 3, currentRetry: number = 0): Promise<void> {
    return this.startHubConnection()
      .catch(err => {
        if (currentRetry < maxRetries) {
          console.log(`Connection attempt ${currentRetry + 1} failed, retrying...`);
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, currentRetry), 8000);
          return new Promise(resolve => setTimeout(resolve, delay))
            .then(() => this.retryConnection(token, maxRetries, currentRetry + 1));
        } else {
          console.error('Max retries reached, connection failed');
          throw err;
        }
      });
  }

  clearDeletedMessages() {
    this.messagesDeletedSource.next([]);
  }

  clearModifiedMessages() {
    this.messagesModifiedSource.next([]);
  }

  private handleConnectionError(error: any) {
    if (!error) return;
    
    // Check if this is an auth error
    const errorMessage = error.toString().toLowerCase();
    if (errorMessage.includes('unauthorized') || 
        errorMessage.includes('401') || 
        errorMessage.includes('status code \'401\'')) {
      
      console.log('Detected 401 error in notifications hub connection');
      
      // Get fresh token from AccountService
      const accountService = inject(AccountService);
      
      // Only attempt token refresh if not already refreshing
      if (!accountService.isRefreshingToken()) {
        console.log('Attempting token refresh after 401');
        accountService.refreshToken().subscribe({
          next: () => {
            console.log('Token refreshed after 401, hub will reconnect via effect');
          },
          error: (refreshError) => {
            console.error('Failed to refresh token after 401:', refreshError);
          }
        });
      } else {
        console.log('Token refresh already in progress, waiting...');
      }
    }
  }
}
