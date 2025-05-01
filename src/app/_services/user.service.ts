import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';


@Injectable({
    providedIn: 'root'
})
export class UserService {
    private baseUrl = `${environment.apiUrl}/api/user`;

    constructor(
        private http: HttpClient,
    ) { 
        
    }
}