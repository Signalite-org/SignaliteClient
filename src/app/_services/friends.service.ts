import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserDTO } from '../_models/UserDTO';
import { FriendRequestDTO } from '../_models/FriendRequestDTO';
import { handleError } from '../_utils/error.handler';

@Injectable({
    providedIn: 'root'
  })
  export class FriendsService {
    private baseUrl = `${environment.apiUrl}/api/friends`;
  
    constructor(
      private http: HttpClient,
    ) { }
    // Pobieranie znajomych użytkownika
    getUserFriends(): Observable<UserDTO[]> {
      return this.http.get<UserDTO[]>(this.baseUrl).pipe(
        catchError(handleError)
      );
    }
  
    // Pobieranie zaproszeń do znajomych
    getFriendRequests(): Observable<FriendRequestDTO[]> {
      return this.http.get<FriendRequestDTO[]>(`${this.baseUrl}/friend-requests`).pipe(
        catchError(handleError)
      );
    }
  
    // Wysyłanie zaproszenia do znajomych
    sendFriendRequest(recipientId: number): Observable<void> {
      return this.http.post<void>(`${this.baseUrl}/friend-request/${recipientId}`, {}).pipe(
        catchError(handleError)
      );
    }
  
    // Akceptacja zaproszenia do znajomych
    acceptFriendRequest(friendRequestId: number): Observable<void> {
      return this.http.post<void>(`${this.baseUrl}/friend-request/accept/${friendRequestId}`, {}).pipe(
        catchError(handleError)
      );
    }
  
    // Odrzucenie zaproszenia do znajomych
    declineFriendRequest(friendRequestId: number): Observable<void> {
      return this.http.delete<void>(`${this.baseUrl}/friend-request/decline/${friendRequestId}`).pipe(
        catchError(handleError)
      );
    }  
  }