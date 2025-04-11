import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FriendRequest } from '../_models/FriendRequest';
import { GroupBasicInfoDTO } from '../_models/GroupBasicInfo';
import { FriendRequestAccepted } from '../_models/FriendRequestAccepted';
import { FriendRequestDTO } from '../_models/FriendRequestDTO';
import { UserDTO } from '../_models/UserDTO';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  private hubConnection?: HubConnection;
  private hubUrl = environment.hubUrl;
  private handlersRegistered = false;
  // New BehaviorSubjects to track notifications
  private friendRequestsSource = new BehaviorSubject<FriendRequestDTO[]>([]);
  friendRequests$ = this.friendRequestsSource.asObservable();
  
  private friendRequestsAcceptedSource = new BehaviorSubject<UserDTO[]>([]);
  friendRequestsAccepted$ = this.friendRequestsAcceptedSource.asObservable();
  
  private addedToGroupSource = new BehaviorSubject<GroupBasicInfoDTO[]>([]);
  addedToGroup$ = this.addedToGroupSource.asObservable();


  constructor(private router: Router) { 
    console.log('NotificationsService constructed');
  }
  
  createHubConnection(token: string) {
    if (!token) {
      console.error('No token provided for notifications hub connection');
      return;
    }
  
    // If a connection already exists, just return
  if (this.hubConnection) {
    console.log('notifications hub connection already exists, not creating a new one');
    return;
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
    // This ensures no messages are missed
    this.registerSignalRHandlers();
  
    // Then start the connection
    this.startHubConnection();
  }

  private startHubConnection() {
    if (!this.hubConnection) return;
  
    this.hubConnection.start()
      .then(() => {
        console.log('✅ Successfully connected to notifications hub');
      })
      .catch(error => {
        console.error('❌ Error starting notifications hub connection:', error);
      });
  }

  private registerSignalRHandlers() {
    if (!this.hubConnection || this.handlersRegistered) return;

  
    console.log('Registering Notifications SignalR handlers...');
  
    this.hubConnection.on('FriendRequest', (notification: FriendRequestDTO) => {
      console.log('📬 Received friend request notification:', notification);
      const currentFriendRequests = this.friendRequestsSource.value;
      this.friendRequestsSource.next([...currentFriendRequests, notification]);
    });
    
    this.hubConnection.on('FriendRequestAccepted', (notification: UserDTO) => {
      console.log('📬 Received friend request accepted notification:', notification);
      const currentAccepted = this.friendRequestsAcceptedSource.value;
      this.friendRequestsAcceptedSource.next([...currentAccepted, notification]);
    });
    
    this.hubConnection.on('MessageReceived', (message) => {
      console.log('📬 Received message:', message);
      
    });

    this.hubConnection.on('AddedToGroup', (groupInfo: GroupBasicInfoDTO) => {
      console.log('📬 Received AddedToGroup notification:', groupInfo);
      const currentGroups = this.addedToGroupSource.value;
      this.addedToGroupSource.next([...currentGroups, groupInfo]);
    });

    this.hubConnection.on('UserAddedToGroup', (userInfo) => {
      console.log('📬 Received UserAddedToGroup notification:', userInfo);
    });

    this.hubConnection.on('GroupUpdated', (groupInfo) => {
      console.log('📬 Received GroupUpdated notification:', groupInfo);
    });

    this.hubConnection.on('UserRemovedFromGroup', (notification) => {
      console.log('📬 Received UserRemovedFromGroup notification:', notification);
    });

    this.hubConnection.on('GroupUpdated', (notification) => {
      console.log('📬 Received GroupUpdated notification:', notification);
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

    this.hubConnection.on('GroupDeleted', (notification) => {
      console.log('📬 Received GroupDeleted notification:', notification);
    });

    this.hubConnection.on('AttachmentRemoved', (notification) => {
      console.log('📬 Received AttachmentRemoved notification:', notification);
    });

    this.handlersRegistered = true;
    console.log('✅ Notification handlers registered');
  }

  stopHubConnection() {
    if (this.hubConnection) {
      console.log('Stopping notifications hub connection...');
      this.hubConnection.stop()
        .catch(error => console.error('Error stopping notifications hub connection:', error))
        .finally(() => {
          this.hubConnection = undefined;
          console.log('Notifications hub connection stopped');
        });
    }
  }

  reconnect(token: string) {
    this.stopHubConnection();
    this.createHubConnection(token);
  }
  
  // DEBUG method - force a disconnection and reconnection
  forceReconnect(token: string) {
    console.log('Forcing reconnection of notifications hub...');
    this.reconnect(token);
    return 'Reconnection forced';
  }

  // Helper methods to clear notifications
  clearFriendRequests() {
    this.friendRequestsSource.next([]);
  }
  
  clearFriendRequestsAccepted() {
    this.friendRequestsAcceptedSource.next([]);
  }
  
  clearAddedToGroup() {
    this.addedToGroupSource.next([]);
  }
}