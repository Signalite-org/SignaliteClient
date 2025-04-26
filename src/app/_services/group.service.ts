import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";
import { GroupBasicInfoDTO } from "../_models/GroupBasicInfoDTO";
import { handleError } from "../_utils/error.handler";
import { GroupMembersDTO } from "../_models/GroupMembersDTO";

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private baseUrl = `${environment.apiUrl}/api/groups`;
  
    constructor(
      private http: HttpClient,
    ) { }

    getGroups(): Observable<GroupBasicInfoDTO[]> {
        return this.http.get<GroupBasicInfoDTO[]>(this.baseUrl).pipe(
          catchError(handleError)
        );
      }
    
      // Tworzenie nowej grupy
      createGroup(groupName: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}?groupName=${encodeURIComponent(groupName)}`, {}).pipe(
          catchError(handleError)
        );
      }
    
      // Modyfikacja nazwy grupy
      modifyGroupName(groupId: number, groupName: string): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${groupId}?groupName=${encodeURIComponent(groupName)}`, {}).pipe(
          catchError(handleError)
        );
      }
    
      // Aktualizacja zdjęcia grupy
      updateGroupPhoto(groupId: number, photo: File): Observable<void> {
        const formData = new FormData();
        formData.append('file', photo);
        
        return this.http.post<void>(`${this.baseUrl}/photo/${groupId}`, formData).pipe(
          catchError(handleError)
        );
      }
    
      // Pobieranie podstawowych informacji o grupie
      getGroupBasicInfo(groupId: number): Observable<GroupBasicInfoDTO> {
        return this.http.get<GroupBasicInfoDTO>(`${this.baseUrl}/${groupId}/basic-info`).pipe(
          catchError(handleError)
        );
      }
    
      // Pobieranie członków grupy
      getGroupMembers(groupId: number): Observable<GroupMembersDTO> {
        return this.http.get<GroupMembersDTO>(`${this.baseUrl}/${groupId}/members`).pipe(
          catchError(handleError)
        );
      }
    
      // Usuwanie grupy
      deleteGroup(groupId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${groupId}`).pipe(
          catchError(handleError)
        );
      }
    
      // Usuwanie użytkownika z grupy
      removeUserFromGroup(groupId: number, userId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${groupId}/users/${userId}`).pipe(
          catchError(handleError)
        );
      }
    
      // Dodawanie użytkownika do grupy
      addUserToGroup(groupId: number, userId: number): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${groupId}/users/${userId}`, {}).pipe(
          catchError(handleError)
        );
      }
}