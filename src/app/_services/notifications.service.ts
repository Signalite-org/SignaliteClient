import { Injectable, signal } from '@angular/core';
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

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  private hubConnection?: HubConnection;
  private hubUrl = environment.hubUrl;
  private handlersRegistered = false;
  // New BehaviorSubjects to track notifications
  private _friendRequests = signal<FriendRequestDTO[]>([]);
  public get friendRequests() {
    return this._friendRequests.asReadonly();
  }

  private _friendRequestsAccepted = signal<UserBasicInfo[]>([]);
  public get friendRequestsAccepted() {
    return this._friendRequestsAccepted.asReadonly();
  }

  private _addedToGroup = signal<GroupBasicInfoDTO[]>([]);
  public get addedToGroup() {
    return this._addedToGroup.asReadonly();
  }

  private _deletedGroup = signal<number>(0);
  public get deletedGroup() {
    return this._deletedGroup.asReadonly();
  }

  private _groupUpdated = signal<GroupBasicInfoDTO>({id: 0, name: "", photoUrl: "", isPrivate: false})
  public get groupUpdated() {
    return this._groupUpdated.asReadonly();
  }

  private _messagesReceived = signal<MessageOfGroupDTO[]>([]);
  public get messagesReceived() {
    return this._messagesReceived.asReadonly();
  }

  private _userAddedToGroup = signal<UserBasicInfo[]>([]);
  public get userAddedToGroup() {
    return this._userAddedToGroup.asReadonly();
  }

  constructor(private router: Router) {
    console.log('NotificationsService constructed');
  }

  createHubConnection(token: string): Promise<void> {
    if (!token) {
      console.error('No token provided for notifications hub connection');
      return Promise.reject('No token provided');
    }
  
    // If a connection already exists, just return
    if (this.hubConnection) {
      console.log('notifications hub connection already exists, not creating a new one');
      return Promise.resolve();
    }
    
    console.log('Creating notifications hub connection...');
  
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
    return this.retryConnection(token)
  }

  private startHubConnection(): Promise<void> {
    if (!this.hubConnection) {
      return Promise.reject('No hub connection exists');
    }
  
    return this.hubConnection.start()
      .then(() => {
        console.log('✅ Successfully connected to notifications hub');
      })
      .catch(error => {
        console.error('❌ Error starting notifications hub connection:', error);
        throw error;
      });
  }

  private registerSignalRHandlers() {
    if (!this.hubConnection || this.handlersRegistered) return;


    console.log('Registering Notifications SignalR handlers...');

    this.hubConnection.on('FriendRequest', (notification: FriendRequestDTO) => {
      console.log('📬 Received friend request notification:', notification);
      this._friendRequests.update(requests => {
        if (!requests.some(req => req.id === notification.id)) {
          return [...requests, notification];
        }
        return requests;
      });
    });

    this.hubConnection.on('FriendRequestAccepted', (notification: UserBasicInfo) => {
      console.log('📬 Received friend request accepted notification:', notification);
      this._friendRequestsAccepted.update(accepted => {
        if (!accepted.some(req => req.id === notification.id)) {
          return [...accepted, notification];
        }
        return accepted;
      });
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
      this._addedToGroup.update(groups => {
        if (!groups.some(group => group.id === groupInfo.id)) {
          return [...groups, groupInfo];
        }
        return groups;
      });
    });

    this.hubConnection.on('UserAddedToGroup', (userInfo: UserBasicInfo) => {
      console.log('📬 Received UserAddedToGroup notification:', userInfo);
      this._userAddedToGroup.update(members => {
        if (!members.some(member => member.id === userInfo.id)) {
          return [...members, userInfo];
        }
        return members;
      });
    });

    this.hubConnection.on('GroupDeleted', (notification: {groupId: number}) => {
      console.log('📬 Received GroupDeleted notification:', notification);
      this._deletedGroup.update(() => {
        return notification.groupId
      })
    });

    this.hubConnection.on('GroupUpdated', (groupInfo: GroupBasicInfoDTO) => {
      console.log('📬 Received GroupUpdated notification:', groupInfo);
      this._groupUpdated.update(() => {
        return groupInfo
      })
    });

    this.hubConnection.on('UserRemovedFromGroup', (notification) => {
      console.log('📬 Received UserRemovedFromGroup notification:', notification);
    });

    this.hubConnection.on('UserUpdated', (notification) => {
      console.log('📬 Received UserUpdated notification:', notification);
    });

    this.hubConnection.on('MessageModified', (notification) => {
      console.log('📬 Received MessageModified notification:', notification);
    });

    this.hubConnection.on('MessageDeleted', (notification) => {
      console.log('📬 Received MessageDeleted notification:', notification);
    });

    this.hubConnection.on('AttachmentRemoved', (notification) => {
      console.log('📬 Received AttachmentRemoved notification:', notification);
    });

    this.handlersRegistered = true;
    console.log('✅ Notification handlers registered');
  }

  stopHubConnection() {
  if (this.hubConnection) {
    console.log('Stopping hub connection...');
    this.hubConnection.stop()
      .catch(error => console.error('Error stopping hub connection:', error))
      .finally(() => {
        this.hubConnection = undefined;
        this.handlersRegistered = false; // Reset this flag
        console.log('Hub connection stopped');
      });
  }
}

  reconnect(token: string) {
    this.stopHubConnection();
    this.createHubConnection(token);
  }

  // Helper methods to clear notifications
  clearFriendRequests() {
    this._friendRequests.set([]);
  }

  clearFriendRequestsAccepted() {
    this._friendRequestsAccepted.set([]);
  }

  clearAddedToGroup() {
    this._addedToGroup.set([]);
  }

  clearReceivedMessages() {
    this._messagesReceived.set([]);
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
}
