import { HttpClient } from '@angular/common/http';
import {Injectable, WritableSignal} from '@angular/core';
import {Observable, catchError, map} from 'rxjs';
import { environment } from '../../environments/environment';
import {UserDTO} from '../_models/UserDTO';
import {handleError} from '../_utils/error.handler';


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = `${environment.apiUrl}/api/User`;
  private currentUserInfo : UserDTO | null = null;

  constructor(
    private http: HttpClient,
  ) { }

  getUserInfo(userId: number): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.baseUrl}/get-user-info?userId=${userId}`)
      .pipe(
        catchError(handleError)
      );
  }

}
