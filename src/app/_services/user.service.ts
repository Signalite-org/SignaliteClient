import { HttpClient } from '@angular/common/http';
import {Injectable, signal, WritableSignal} from '@angular/core';
import {Observable, catchError, map, switchMap, tap} from 'rxjs';
import { environment } from '../../environments/environment';
import {UserDTO} from '../_models/UserDTO';
import {handleError} from '../_utils/error.handler';
import { ChangePasswordDTO } from '../_models/ChangePasswordDTO';
import { OwnUserDTO } from '../_models/OwnUserDTO';
import { ModifyUserDTO } from '../_models/ModifyUserDTO';


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = `${environment.apiUrl}/api/User`;

  private _ownUser = signal<OwnUserDTO | null>(null);
  readonly ownUser = this._ownUser.asReadonly();

  constructor(
    private http: HttpClient,
  ) { 

    
  }

   setOwnUser(user: OwnUserDTO | null): void {
    this._ownUser.set(user);
  }

  refreshOwnUser(): Observable<OwnUserDTO> {
    return this.getUserInfo().pipe(
      map(user => {
        const own = user as OwnUserDTO;
        this._ownUser.set(own);
        return own;
      }),
      catchError((err) => {
        console.error(err);
        throw err;
      })
    );
  }

  
  modifyUser(modifyUserDTO : ModifyUserDTO): Observable<void>{
    return this.http.put<void>(`${this.baseUrl}/modify-user`,  modifyUserDTO).pipe(
        switchMap(() => this.getUserInfo()),
        tap(user => this._ownUser.set(user as OwnUserDTO)),
        map(() => void 0),
        catchError(handleError)
    );
  }

  getUserInfo(userId?: number): Observable<UserDTO | OwnUserDTO> {
    return this.http.get<UserDTO>(`${this.baseUrl}/get-user-info?userId=${userId}`)
      .pipe(
        catchError(handleError)
      );
  }

  getUserByUsername(username: string): Observable<UserDTO> {
        return this.http.get<UserDTO>(`${this.baseUrl}/${username}`)
          .pipe(
              catchError(handleError)
          );
    }

  checkUserExists(username: string): Observable<boolean> { //Delete this later!!!
    return this.http.get<boolean>(`${this.baseUrl}/user-exists/${username}`);
  }

  changePassword(changePasswordDTO: ChangePasswordDTO){
    return this.http.put(`${this.baseUrl}/change-password`, changePasswordDTO);
  }

  updateProfilePhoto(file: string){
    return this.http.post<void>(`${this.baseUrl}/change-password`, {params: { file }}).pipe(
        catchError(handleError)
    );
  }

  deleteProfilePhoto(): Observable<void>{
    return this.http.delete<void>(`${this.baseUrl}/change-password`).pipe(
        catchError(handleError)
    );
  }

  updateBackgroundPhoto(file: string){
    return this.http.post<void>(`${this.baseUrl}/change-password`, {params: { file }}).pipe(
        catchError(handleError)
    );
  }
  
  deleteBackgroundPhoto(): Observable<void>{
    return this.http.delete<void>(`${this.baseUrl}/change-password`).pipe(
        catchError(handleError)
    );
  }
}
