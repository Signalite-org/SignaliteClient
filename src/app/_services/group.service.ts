import { effect, Injectable, signal, untracked } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, catchError, Observable, tap } from "rxjs";
import { GroupBasicInfoDTO } from "../_models/GroupBasicInfoDTO";
import { handleError } from "../_utils/error.handler";
import { GroupMembersDTO } from "../_models/GroupMembersDTO";
import { MessageOfGroupDTO } from "../_models/MessageOfGroupDTO";
import { MessageDTO } from "../_models/MessageDTO";
import { NotificationsService } from "./notifications.service";
import { UserService } from "./user.service";
import { UserBasicInfo } from "../_models/UserBasicInfo";

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private baseUrl = `${environment.apiUrl}/api/groups`;
    
    // BehaviorSubject przechowujący aktualną listę grup
    private _groups = signal<GroupBasicInfoDTO[]>([])
    public get groups() {
      return this._groups.asReadonly()
    }

    private _groupMembers = signal<GroupMembersDTO>({members: [], owner: {id: -1, username: "", profilePhotoUrl: ""}})
    public get groupMembers() {
      return this._groupMembers.asReadonly()
    }

    // BehaviorSubject dla aktualizacji wiadomości
    private lastMessageUpdatedSubject = new BehaviorSubject<MessageOfGroupDTO[]>([]);
    
    // Observable dla aktualizacji wiadomości
    public lastMessageUpdated$ = this.lastMessageUpdatedSubject.asObservable();
 
    constructor(
      private http: HttpClient,
      private notificationService: NotificationsService,
      private userService: UserService
    ) { 
      // Inicjalizacja listy grup przy tworzeniu serwisu
      this.fetchGroups();

      this.notificationService.userUpdated$.subscribe(modifiedUser => {        
        if (modifiedUser.id > 0) {
          const updatedUser: UserBasicInfo = {
            id: modifiedUser.id,
            username: modifiedUser.username,
            profilePhotoUrl: modifiedUser.profilePhotoUrl,
          };

          const currentMembers = this._groupMembers();

          // Update members
          const updatedMembers = currentMembers.members.map(member =>
            member.id === updatedUser.id ? updatedUser : member
          );

          // Update owner
          const updatedOwner = currentMembers.owner.id === updatedUser.id ? updatedUser : currentMembers.owner;

          this._groupMembers.update(() => ({
            members: updatedMembers,
            owner: updatedOwner
          }));
          
          if (modifiedUser.username && modifiedUser.oldUsername) {
            const oldUsername = modifiedUser.oldUsername;
            const newUsername = modifiedUser.username;

            this._groups.update(groups =>
              groups.map(group => {
                let updatedLastMessage = group.lastMessage;

                if (updatedLastMessage) {
                  const colonIndex = updatedLastMessage.indexOf(":");
                  if (colonIndex !== -1) {
                    const senderPart = updatedLastMessage.substring(0, colonIndex);
                    const messagePart = updatedLastMessage.substring(colonIndex);

                    if (senderPart === oldUsername) {
                      updatedLastMessage = newUsername + messagePart;
                    }
                  }
                }

                if (group.isPrivate && group.name === oldUsername) {
                  return {
                    ...group,
                    name: newUsername,
                    photoUrl: updatedUser.profilePhotoUrl,
                    lastMessage: updatedLastMessage
                  };
                }

                return {
                  ...group,
                  lastMessage: updatedLastMessage
                };
              })
            );
          }
        }
      });

      effect(() => {
        const updatedGroup = this.notificationService.groupUpdated()
        if (updatedGroup.id > 0) {
          this._groups.update(groups => groups.map(group => group.id === updatedGroup.id ? updatedGroup : group))
        }
      });

      effect(() => {
        const addedToGroup = this.notificationService.addedToGroup()
        if (addedToGroup.id > 0) {
          this._groups.update(groups => [...groups, addedToGroup])
        }
      });

      effect(() => {
        const deletedGroupId = this.notificationService.deletedGroup()
        if (deletedGroupId > 0) {
          this._groups.update(groups => groups.filter(group => group.id !== deletedGroupId))
        }
      });

      effect(() => {
        const userAddedToGroup = this.notificationService.userAddedToGroup()
        if (userAddedToGroup.id > 0) {
          let newGroupMembers = this._groupMembers()
          console.log('New group members:', JSON.stringify(newGroupMembers.members, null, 2))
          newGroupMembers?.members.push(userAddedToGroup)
          this._groupMembers.update(() => newGroupMembers)
          console.log('Group members signal after update:', JSON.stringify(this._groupMembers().members, null, 2))
        }
      });

      effect(() => {
        const newFriendGroup = this.notificationService.friendRequestsAccepted()
        if (newFriendGroup) {
          this._groups.update(groups => [...groups, newFriendGroup])
        }
      });

    }
    
  moveGroupToTop(groupId: number): void {
    const currentGroups = this._groups();
    const groupIndex = currentGroups.findIndex(group => group.id === groupId);
  
    if (groupIndex !== -1) {
      const [groupToMove] = currentGroups.slice(groupIndex, groupIndex + 1);
    
      const updatedGroups = [
        groupToMove, 
        ...currentGroups.slice(0, groupIndex), 
        ...currentGroups.slice(groupIndex + 1)
      ];
    
      this._groups.set(updatedGroups);
    }
  }
    
    // Metoda do odświeżania listy grup
    fetchGroups() {
      this.http.get<GroupBasicInfoDTO[]>(this.baseUrl)
        .pipe(catchError(handleError))
        .subscribe(groups => {
          this._groups.set(groups);
        });
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
      const currentGroups = this._groups();
      const groupIndex = currentGroups.findIndex(g => g.id === groupId);
      
      if (groupIndex !== -1) {
        // Extract the group that received a new message
        const updatedGroup = {
          ...currentGroups[groupIndex],
          lastMessage: `${senderUsername}: ${content || 'sent file'}`,
        };

        this._groups.update(groups => groups.map(group => group.id === groupId ? updatedGroup : group))
      }
    }
   
    createGroup(groupName: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}?groupName=${encodeURIComponent(groupName)}`, {})
          .pipe(
            tap(() => {
              this.fetchGroups();
            }),
            catchError(handleError)
          );
    }
   
    // Pozostałe metody pozostają bez zmian
    modifyGroupName(groupId: number, groupName: string): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${groupId}?groupName=${encodeURIComponent(groupName)}`, {})
          .pipe(
            tap(() => {
              this.fetchGroups();
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
              this.fetchGroups();
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
   
    getGroupMembers(groupId: number) {
      this.http.get<GroupMembersDTO>(`${this.baseUrl}/${groupId}/members`)
          .pipe(catchError(handleError))
          .subscribe(members => {
            this._groupMembers.set(members);
          })
    }
   
    deleteGroup(groupId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${groupId}`)
          .pipe(
            tap(() => {
              this.fetchGroups();
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