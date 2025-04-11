import { Injectable, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { UserBasicInfo } from '../_models/UserBasicInfo';


@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private hubConnection?: HubConnection;
  private readonly hubUrl = environment.hubUrl;

  // Simple BehaviorSubject for just the user IDs
  private onlineUserIds = signal<number[]>([])
  public get onlineUsersIds() {
    return this.onlineUserIds.asReadonly()
  }

  // Detailed BehaviorSubject for debugging
  private onlineUsersDetailedSource = new BehaviorSubject<UserBasicInfo[]>([]);
  onlineUsersDetailed$ = this.onlineUsersDetailedSource.asObservable();
  
  constructor(private router: Router) {
    console.log('PresenceService constructed');
  }

  createHubConnection(token: string) {
    if (!token) {
      console.error('No token provided for hub connection');
      return;
    }

    console.log('Creating presence hub connection...');

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}/presence`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.startHubConnection();
  }

  private startHubConnection() {
    if (!this.hubConnection) return;

    this.hubConnection.start()
      .then(() => {
        console.log('✅ Successfully connected to presence hub');
        this.registerSignalRHandlers();
      })
      .catch(error => {
        console.error('❌ Error starting presence hub connection:', error);
      });
  }

  private registerSignalRHandlers() {
    if (!this.hubConnection) return;

    console.log('Registering SignalR handlers...');

    // Get simple list of online user IDs
    this.hubConnection.on('GetOnlineUserIds', (userIds: number[]) => {
      console.log('📋 Received online user IDs:', userIds);
      this.onlineUserIds.set(userIds)
    });

    // Get detailed online user information (for debugging)
    this.hubConnection.on('GetOnlineUsersDetailed', (users: UserBasicInfo[]) => {
      console.log('📋 Received detailed online users:', users);
      this.onlineUsersDetailedSource.next(users);
    });

    // Handle user online
    this.hubConnection.on('UserIsOnline', (user: UserBasicInfo) => {
      console.log(`👤 User connected: ${user.username} (ID: ${user.id})`);
      
      // Update the simple ID list
      this.onlineUserIds.update(ids => {
        // Only add the ID if it's not already in the list
        if (!ids.includes(user.id)) {
          return [...ids, user.id];
        }
        return ids;
      });
      
      // Update the detailed list
      const currentDetailed = this.onlineUsersDetailedSource.value;
      if (!currentDetailed.some(u => u.id === user.id)) {
        this.onlineUsersDetailedSource.next([...currentDetailed, user]);
      }
    });

    // Handle user offline
    this.hubConnection.on('UserIsOffline', (user:UserBasicInfo) => {
      console.log(`👤 User disconnected: ${user.username}(ID: ${user.id})`);
      
      // Update the simple ID list
      this.onlineUserIds.update(ids => ids.filter(id => id !== user.id));
      
      // Update the detailed list
      const currentDetailed = this.onlineUsersDetailedSource.value;
      this.onlineUsersDetailedSource.next(currentDetailed.filter(u => u.id !== user.id));
    });

    // Handle KeepAlive requests from server
    this.hubConnection.on('KeepAlive', (timestamp: Date) => {
      console.log('♥️ Received KeepAlive request at:', new Date().toISOString());
      // Immediately respond to keep-alive request
      this.hubConnection?.invoke('KeepAliveResponse', new Date()).then(() => {
        console.log('✅ Sent KeepAlive response');
      }).catch(error => {
        console.error('❌ Error sending keep-alive response:', error);
      });
    });
  }

  stopHubConnection() {
    if (this.hubConnection) {
      console.log('Stopping hub connection...');
      this.hubConnection.stop()
        .catch(error => console.error('Error stopping hub connection:', error))
        .finally(() => {
          this.hubConnection = undefined;
          console.log('Presence hub connection stopped');
        });
    }
  }

  reconnect(token: string) {
    this.stopHubConnection();
    this.createHubConnection(token);
  }
  
  // Helper method to check if a user is online
  isUserOnline(userId: number): boolean {
    return this.onlineUserIds().includes(userId);
  }
}