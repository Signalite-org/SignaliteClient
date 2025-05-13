import { HttpClient } from '@angular/common/http';
import { effect, Injectable, OnInit, signal } from '@angular/core';
import { Observable, catchError, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { FriendRequestDTO } from '../_models/FriendRequestDTO';
import { handleError } from '../_utils/error.handler';
import { UserBasicInfo } from '../_models/UserBasicInfo';
import { NotificationsService } from './notifications.service';

@Injectable({
    providedIn: 'root'
  })
  export class FriendsService implements OnInit {
    private baseUrl = `${environment.apiUrl}/api/friends`;
    private _friendRequests = signal<FriendRequestDTO[]>([])
    public get friendRequests(){
      return this._friendRequests.asReadonly()
    }
  
    constructor(
      private http: HttpClient,
      private notificationsService: NotificationsService
    ) 
    { 
      this.loadFriendRequests().subscribe();

      effect(() => {
        const newFriendRequest = this.notificationsService.friendRequest();
        
        // only process if there's an actual request (not null)
        if (newFriendRequest) {
          // add the incoming request to our existing requests if it's not already there
          this._friendRequests.update(currentRequests => {
            // first check if this request already exists
            if (!currentRequests.some(req => req.id === newFriendRequest.id)) {
              // if not, add it to the array
              return [...currentRequests, newFriendRequest];
            }
            return currentRequests;
          });
          
          // clear the notification 
          this.notificationsService.clearFriendRequest();
        }
      });

      
    }
  ngOnInit(): void {

  }

    getUserFriends(): Observable<UserBasicInfo[]> {
      return this.http.get<UserBasicInfo[]>(this.baseUrl).pipe(
        catchError(handleError)
      );
    }
  

    loadFriendRequests(): Observable<FriendRequestDTO[]> {
      return this.http.get<FriendRequestDTO[]>(`${this.baseUrl}/friend-requests`).pipe(
        tap(requests => {
          console.log("AAAAAAAAAAAAAAAA")
          this._friendRequests.set(requests);
        }),
        catchError(handleError)
      );
    }
  
    sendFriendRequest(recipientUsername: string): Observable<void> {
      return this.http.post<void>(`${this.baseUrl}/friend-request/${recipientUsername}`, {}).pipe(
        catchError(handleError)
      );
    }
  
    acceptFriendRequest(friendRequestId: number): Observable<void> {
      return this.http.post<void>(`${this.baseUrl}/friend-request/accept/${friendRequestId}`, {}).pipe(
        tap(() => {
          // remove the accepted request from our signal
          this._friendRequests.update(requests => 
            requests.filter(req => req.id !== friendRequestId)
          );
        }),
        catchError(handleError)
      );
    }
  
    // Odrzucenie zaproszenia do znajomych
    declineFriendRequest(friendRequestId: number): Observable<void> {
      return this.http.delete<void>(`${this.baseUrl}/friend-request/decline/${friendRequestId}`).pipe(
        tap(() => {
          // remove the declined request from our signal
          this._friendRequests.update(requests => 
            requests.filter(req => req.id !== friendRequestId)
          );
        }),
        catchError(handleError)
      );
    } 
  }