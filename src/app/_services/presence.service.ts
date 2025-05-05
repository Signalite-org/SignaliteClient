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
  private handlersRegistered = false;

  // simple ids of online users
  private _onlineUserIds = signal<number[]>([])
  public get onlineUserIds() {
    return this._onlineUserIds.asReadonly()
  }

  // Online users with their info
  private _onlineUsers = signal<UserBasicInfo[]>([]);
  public get onlineUsers() {
    return this._onlineUsers.asReadonly();
  }
  
  constructor(private router: Router) {
    console.log('PresenceService constructed');
  }

  createHubConnection(token: string) {
    if (!token) {
      console.error('No token provided for hub connection');
      return;
    }

    // If a connection already exists, just return
  if (this.hubConnection) {
    console.log('presence hub connection already exists, not creating a new one');
    return;
  }
    console.log('Creating presence hub connection...');

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}/presence`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();
    this.registerSignalRHandlers();
    this.startHubConnection();
  }

  private startHubConnection() {
    if (!this.hubConnection) return;

    this.hubConnection.start()
      .then(() => {
        console.log('✅ Successfully connected to presence hub');
      })
      .catch(error => {
        console.error('❌ Error starting presence hub connection:', error);
      });
  }

  private registerSignalRHandlers() {
    if (!this.hubConnection || this.handlersRegistered) return;

    console.log('Registering presenceHub handlers...');

    this.hubConnection.on('GetOnlineUserIds', (userIds: number[]) => {
      console.log('📋 Received online user IDs:', userIds);
      this._onlineUserIds.set(userIds)
    });

    this.hubConnection.on('GetOnlineUsersDetailed', (users: UserBasicInfo[]) => {
      console.log('📋 Received detailed online users:', users);
      this._onlineUsers.set(users);
    });


    this.hubConnection.on('UserIsOnline', (user: {username: string, id: number}) => {
      console.log(`👤 User connected: ${user.username} (ID: ${user.id})`);
      
      this._onlineUserIds.update(ids => {
        // Only add the ID if it's not already in the list
        if (!ids.includes(user.id)) {
          return [...ids, user.id];
        }
        return ids;
      });
    });


    this.hubConnection.on('UserIsOffline', (user:UserBasicInfo) => {
      console.log(`👤 User disconnected: ${user.username}(ID: ${user.id})`);
      
      this._onlineUserIds.update(ids => ids.filter(id => id !== user.id));
      
      this._onlineUsers.update(users => {
        // Only add the user if they're not already in the list
        if (!users.some(u => u.id === user.id)) {
          return [...users, user];
        }
        return users;
      });
    });

    this.hubConnection.on('KeepAlive', (timestamp: Date) => {
      console.log('♥️ Received KeepAlive request at:', new Date().toISOString());
      // Immediately respond to keep-alive request
      this.hubConnection?.invoke('KeepAliveResponse', new Date()).then(() => {
        console.log('✅ Sent KeepAlive response');
      }).catch(error => {
        console.error('❌ Error sending keep-alive response:', error);
      });
    });

    this.handlersRegistered = true;
    console.log('✅ Presence handlers registered');
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