import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private hubConnection?: HubConnection;
  private readonly hubUrl = environment.hubUrl;

  private onlineUsersSource = new BehaviorSubject<string[]>([]);
  onlineUsers$ = this.onlineUsersSource.asObservable();
  
  constructor(private router: Router) {
    console.log('PresenceService constructed');
  }

  // This method will be called from AccountService after login
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

    // Register hub methods
    console.log('Registering SignalR handlers...');

    // Get current online users
    this.hubConnection.on('GetOnlineUsers', (usernames: string[]) => {
      console.log('📋 Received online users:', usernames);
      this.onlineUsersSource.next(usernames);
    });

    // Handle user online
    this.hubConnection.on('UserIsOnline', (username: string) => {
      console.log(`👤 User connected: ${username}`);
      const currentUsers = this.onlineUsersSource.value;
      if (!currentUsers.includes(username)) {
        this.onlineUsersSource.next([...currentUsers, username]);
      }
    });

    // Handle user offline
    this.hubConnection.on('UserIsOffline', (username: string) => {
      console.log(`👤 User disconnected: ${username}`);
      const currentUsers = this.onlineUsersSource.value;
      this.onlineUsersSource.next([...currentUsers.filter(x => x !== username)]);
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
}