import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  private hubConnection?: HubConnection;
  private hubUrl = environment.hubUrl;
  
  constructor(private router: Router) { 
    console.log('NotificationsService constructed');
  }
  
  createHubConnection(token: string) {
    if (!token) {
      console.error('No token provided for notifications hub connection');
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
    if (!this.hubConnection) {
      console.error('Cannot register Notification handlers - hub connection is not initialized');
      return;
    }
  
    console.log('Registering Notifications SignalR handlers...');
  
    this.hubConnection.on('FriendRequest', (notification) => {
      console.log('📬 Received friend request notification:', notification);
    });
    
    this.hubConnection.on('FriendRequestAccepted', (notification) => {
      console.log('📬 Received friend request accepted notification:', notification);
    });
    
    this.hubConnection.on('MessageReceived', (message) => {
      console.log('📬 Received message:', message);
    });

    this.hubConnection.on('AddedToGroup', (groupInfo) => {
      console.log('📬 Received AddedToGroup notification:', groupInfo);
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
    console.log('✅ Notification handlers registered');

    this.hubConnection.on('AttachmentRemoved', (notification) => {
      console.log('📬 Received AttachmentRemoved notification:', notification);
    });
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
}