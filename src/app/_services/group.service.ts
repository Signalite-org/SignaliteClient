import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, catchError, Observable, tap } from "rxjs";
import { GroupBasicInfoDTO } from "../_models/GroupBasicInfoDTO";
import { handleError } from "../_utils/error.handler";
import { GroupMembersDTO } from "../_models/GroupMembersDTO";
import { MessageOfGroupDTO } from "../_models/MessageOfGroupDTO";
import { MessageDTO } from "../_models/MessageDTO";

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private baseUrl = `${environment.apiUrl}/api/groups`;
    
    // BehaviorSubject przechowujący aktualną listę grup
    private groupsSubject = new BehaviorSubject<GroupBasicInfoDTO[]>([]);
    
    // Observable, który komponenty mogą subskrybować
    public groups$ = this.groupsSubject.asObservable();
    
    // BehaviorSubject dla aktualizacji wiadomości
    private lastMessageUpdatedSubject = new BehaviorSubject<MessageOfGroupDTO[]>([]);
    
    // Observable dla aktualizacji wiadomości
    public lastMessageUpdated$ = this.lastMessageUpdatedSubject.asObservable();
 
    constructor(
      private http: HttpClient,
    ) { 
      // Inicjalizacja listy grup przy tworzeniu serwisu
      this.refreshGroups();
    }
    
    // Metoda do odświeżania listy grup
    refreshGroups() {
      this.http.get<GroupBasicInfoDTO[]>(this.baseUrl)
        .pipe(catchError(handleError))
        .subscribe(groups => {
          this.groupsSubject.next(groups);
        });
    }
    
    getGroups(): Observable<GroupBasicInfoDTO[]> {
        // Jeśli w subjeccie są już dane, używamy ich
        if (this.groupsSubject.value.length > 0) {
          return this.groups$;
        }
        
        // W przeciwnym razie odświeżamy dane
        this.refreshGroups();
        return this.groups$;
    }
    
    // Metoda do aktualizacji lastMessage dla konkretnej grupy
    updateLastMessage(groupId: number, senderUsername: string, content: string | null, messageId: number) {
      // Tworzymy obiekt MessageDTO
      const messageDTO: MessageDTO = {
        id: messageId,
        content: content || '',
        lastModification: new Date().toISOString(),
        sender: {
          id: 0, // ID nie jest istotne w tym kontekście
          username: senderUsername,
          profilePhotoUrl: undefined
        }
      };
      
      // Tworzymy obiekt MessageOfGroupDTO
      const messageOfGroupDTO: MessageOfGroupDTO = {
        groupId: groupId,
        message: messageDTO
      };
      
      // Emitujemy zdarzenie aktualizacji wiadomości
      this.emitLastMessageUpdate([messageOfGroupDTO]);
      
      // Opcjonalnie aktualizujemy również listę grup
      this.updateGroupsLastMessage(groupId, senderUsername, content);
    }
    
      // Metoda do emitowania zdarzenia aktualizacji wiadomości
      emitLastMessageUpdate(messages: MessageOfGroupDTO[]) {
      this.lastMessageUpdatedSubject.next(messages);
    }
    
    // Metoda do aktualizacji lastMessage w liście grup
    private updateGroupsLastMessage(groupId: number, senderUsername: string, content: string | null) {
      const currentGroups = this.groupsSubject.value;
      const groupIndex = currentGroups.findIndex(g => g.id === groupId);
      
      if (groupIndex !== -1) {
        // Extract the group that received a new message
        const updatedGroup = {
          ...currentGroups[groupIndex],
          lastMessage: `${senderUsername}: ${content || 'sent file'}`,
        };
        
        // Remove the group from its current position
        const filteredGroups = currentGroups.filter(g => g.id !== groupId);
        
        // Create the new array with the updated group at the beginning
        const updatedGroups = [updatedGroup, ...filteredGroups];
        
        // Emit the updated list of groups
        this.groupsSubject.next(updatedGroups);
      }
    }
   
    createGroup(groupName: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}?groupName=${encodeURIComponent(groupName)}`, {})
          .pipe(
            tap(() => {
              // Po utworzeniu grupy odświeżamy listę grup
              this.refreshGroups();
            }),
            catchError(handleError)
          );
    }
   
    // Pozostałe metody pozostają bez zmian
    modifyGroupName(groupId: number, groupName: string): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${groupId}?groupName=${encodeURIComponent(groupName)}`, {})
          .pipe(
            tap(() => {
              this.refreshGroups();
            }),
            catchError(handleError)
          );
    }
    
    updateGroupPhoto(groupId: number, photo: File): Observable<void> {
        const formData = new FormData();
        formData.append('file', photo);
       
        return this.http.post<void>(`${this.baseUrl}/photo/${groupId}`, formData)
          .pipe(
            tap(() => {
              this.refreshGroups();
            }),
            catchError(handleError)
          );
    }
   
    getGroupBasicInfo(groupId: number): Observable<GroupBasicInfoDTO> {
        return this.http.get<GroupBasicInfoDTO>(`${this.baseUrl}/${groupId}/basic-info`)
          .pipe(
            catchError(handleError)
          );
    }
   
    getGroupMembers(groupId: number): Observable<GroupMembersDTO> {
        return this.http.get<GroupMembersDTO>(`${this.baseUrl}/${groupId}/members`)
          .pipe(
            catchError(handleError)
          );
    }
   
    deleteGroup(groupId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${groupId}`)
          .pipe(
            tap(() => {
              this.refreshGroups();
            }),
            catchError(handleError)
          );
    }
   
    removeUserFromGroup(groupId: number, userId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${groupId}/users/${userId}`)
          .pipe(
            catchError(handleError)
          );
    }
   
    addUserToGroup(groupId: number, userId: number): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${groupId}/users/${userId}`, {})
          .pipe(
            catchError(handleError)
          );
    }
}