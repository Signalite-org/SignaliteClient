import { effect, inject, Injectable, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { UserBasicInfo } from '../_models/UserBasicInfo';
import { AccountService } from './account.service';


@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private hubConnection?: HubConnection;
  private readonly hubUrl = environment.hubUrl;
  private handlersRegistered = false;
  private connectionActive = false;
  private reconnectAttemptInProgress = false;

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

  private _isInitialized = signal<boolean>(false);
  public get isInitialized() {
    return this._isInitialized.asReadonly();
  }
  
  constructor(private router: Router) {
    console.log('PresenceService constructed');
    
    // Get AccountService via inject to avoid circular dependency
    const accountService = inject(AccountService);
    
    // Create an effect to monitor the currentUser signal
    effect(() => {
      const user = accountService.currentUser();
      const isRefreshing = accountService.isRefreshingToken();
      
      console.log('PresenceService detected auth state change, user:', user ? 'exists' : 'null', 
                 'isRefreshing:', isRefreshing);
      
      if (user?.accessToken && !isRefreshing) {
        console.log('PresenceService: User authenticated, creating hub connection');
        this.createHubConnection(user.accessToken);
      } else if (!user && this.connectionActive) {
        console.log('PresenceService: User logged out, stopping hub connection');
        this.stopHubConnection();
      }
    });
  }

  async createHubConnection(token: string) {
    if (!token) {
      console.error('No token provided for hub connection');
      return Promise.reject('No token provided');
    }

    // Important: Always recreate the connection when this method is called
    // even if one exists, to ensure we're using the latest token
    if (this.hubConnection) {
      console.log('Stopping existing presence hub connection before creating a new one');
      await this.stopHubConnection();
    }
    
    console.log('Creating presence hub connection with token:', token.substring(0, 15) + '...');
    
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.hubUrl}/presence`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();
      
    this.registerSignalRHandlers();
    return this.retryConnection(token);
  }

  private startHubConnection() {
    if (!this.hubConnection) {
      return Promise.reject('No hub connection exists');
    }

    return this.hubConnection.start()
      .then(() => {
        console.log('✅ Successfully connected to presence hub');
        this.connectionActive = true;
        this._isInitialized.set(true);
      })
      .catch(error => {
        console.error('❌ Error starting presence hub connection:', error);
        this.connectionActive = false;
        this.handleConnectionError(error);
        throw error; // Re-throw to propagate the error
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

    this.hubConnection.onclose((error) => {
      console.log('Notifications hub connection closed', error);
      this.connectionActive = false;
      if (error) {
        this.handleConnectionError(error);
      }
    });

    this.handlersRegistered = true;
    console.log('✅ Presence handlers registered');
  }

  stopHubConnection() {
    if (this.hubConnection) {
      console.log('Stopping presence hub connection...');
      
      return this.hubConnection.stop()
        .catch(error => console.error('Error stopping presence hub connection:', error))
        .finally(() => {
          this.hubConnection = undefined;
          this.handlersRegistered = false;
          this._isInitialized.set(false);
          this.connectionActive = false;
          this.resetData();
          console.log('Presence hub connection stopped and reset');
        });
    }
    return Promise.resolve();
  }

  private resetData(): void {
  this._onlineUserIds.set([]);
  this._onlineUsers.set([]);
}

  reconnect(token: string) {
    if (this.reconnectAttemptInProgress) {
      console.log('Reconnect attempt already in progress, skipping');
      return;
    }
    
    this.reconnectAttemptInProgress = true;
    
    console.log('Reconnecting presence hub with new token');
    this.stopHubConnection()
      .then(() => this.createHubConnection(token))
      .finally(() => {
        this.reconnectAttemptInProgress = false;
      });
  }
  
  // Helper method to check if a user is online
  isUserOnline(userId: number): boolean {
    return this.onlineUserIds().includes(userId);
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

  private handleConnectionError(error: any) {
    if (!error) return;
    
    // Check if this is an auth error
    const errorMessage = error.toString().toLowerCase();
    if (errorMessage.includes('unauthorized') || 
        errorMessage.includes('401') || 
        errorMessage.includes('status code \'401\'')) {
      
      console.log('Detected 401 error in presence hub connection');
      
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