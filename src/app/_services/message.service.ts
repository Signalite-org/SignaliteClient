import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";
import { handleError } from "../_utils/error.handler";
import { SendMessageDTO } from "../_models/SendMessageDTO";
import { PaginationQuery } from "../_models/PaginationQuery";
import { MessageDTO } from "../_models/MessageDTO";
import {MessageThreadDTO} from '../_models/MessageThreadDTO';
import {MessagePostResponse} from '../_models/MessagePostResponse';
import {MessageOfGroupDTO} from '../_models/MessageOfGroupDTO';

@Injectable({
    providedIn: 'root'
})
export class MessageService {
    private baseUrl = `${environment.apiUrl}/api/message`;

    constructor(
      private http: HttpClient,
    ) { }

    // Wysyłanie wiadomości
    sendMessage(messageDto: SendMessageDTO): Observable<MessagePostResponse> {
        const formData = new FormData();

        // Dodanie pól z messageDto do formData
        formData.append('content', messageDto.content);
        formData.append('groupId', messageDto.groupId.toString());

        // Dodanie załącznika, jeśli istnieje
        if (messageDto.attachment) {
            formData.append('file', messageDto.attachment);
        }

        return this.http.post<MessagePostResponse>(this.baseUrl + "/", formData).pipe(
            catchError(handleError)
        );
    }

    // Pobieranie wątku wiadomości
    getMessageThread(groupId: number, paginationQuery?: PaginationQuery): Observable<MessageThreadDTO> {
        let url = `${this.baseUrl}/${groupId}`;

        // Dodanie parametrów paginacji, jeśli zostały przekazane
        if (paginationQuery) {
            const params = new URLSearchParams();
            if (paginationQuery.pageNumber !== undefined) {
                params.append('pageNumber', paginationQuery.pageNumber.toString());
            }
            if (paginationQuery.pageSize !== undefined) {
                params.append('pageSize', paginationQuery.pageSize.toString());
            }
            url += `?${params.toString()}`;
        }

        return this.http.get<MessageThreadDTO>(url).pipe(
            catchError(handleError)
        );
    }

    // Usuwanie wiadomości
    deleteMessage(messageId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${messageId}`).pipe(
            catchError(handleError)
        );
    }

    // Usuwanie załącznika
    deleteAttachment(messageId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${messageId}/attachment`).pipe(
            catchError(handleError)
        );
    }

    // Modyfikacja wiadomości
    modifyMessage(messageId: number, messageContent: string): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${messageId}?messageContent=${encodeURIComponent(messageContent)}`, {}).pipe(
            catchError(handleError)
        );
    }
}
