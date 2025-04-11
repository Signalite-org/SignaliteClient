import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserDTO } from '../_models/UserDTO';
import { FriendRequestDTO } from '../_models/FriendRequestDTO';
import { ErrorResponse } from '../_models/ErrorResponse';

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
        catchError(this.handleError)
      );
    }
  
    // Pobieranie zaproszeń do znajomych
    getFriendRequests(): Observable<FriendRequestDTO[]> {
      return this.http.get<FriendRequestDTO[]>(`${this.baseUrl}/friend-requests`).pipe(
        catchError(this.handleError)
      );
    }
  
    // Wysyłanie zaproszenia do znajomych
    sendFriendRequest(recipientId: number): Observable<void> {
      return this.http.post<void>(`${this.baseUrl}/friend-request/${recipientId}`, {}).pipe(
        catchError(this.handleError)
      );
    }
  
    // Akceptacja zaproszenia do znajomych
    acceptFriendRequest(friendRequestId: number): Observable<void> {
      return this.http.post<void>(`${this.baseUrl}/friend-request/accept/${friendRequestId}`, {}).pipe(
        catchError(this.handleError)
      );
    }
  
    // Odrzucenie zaproszenia do znajomych
    declineFriendRequest(friendRequestId: number): Observable<void> {
      return this.http.delete<void>(`${this.baseUrl}/friend-request/decline/${friendRequestId}`).pipe(
        catchError(this.handleError)
      );
    }
  
    // Uniwersalna obsługa błędów odpowiadająca strukturze ErrorResponse z ASP.NET Core
    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Wystąpił nieznany błąd';
        
        if (error.error instanceof ErrorEvent) {
          // Błąd po stronie klienta
          errorMessage = `Błąd: ${error.error.message}`;
        } else {
          // Błąd po stronie serwera
          // Mapujemy obiekt błędu z ASP.NET Core do naszego interfejsu
          try {
            // ASP.NET Core używa PascalCase, a TypeScript camelCase
            const serverError: ErrorResponse = {
              statusCode: error.error.StatusCode || error.status,
              message: error.error.Message || 'Brak szczegółów błędu',
              errors: error.error.Errors || []
            };
            
            console.log(serverError)
            
            errorMessage = serverError.message;
            
            // Jeśli są dostępne szczegółowe błędy, dodajemy je do komunikatu
            if (serverError.errors && serverError.errors.length > 0) {
              errorMessage += ': ' + serverError.errors.join(', ');
            }
          } catch (parsingError) {
            // Fallback, jeśli nie udało się sparsować ErrorResponse
            errorMessage = `Kod błędu: ${error.status}, Wiadomość: ${error.message}`;
          }
        }
        return throwError(() => new Error(errorMessage));
      }
  }