import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchResetService {
  private resetSearchSubject = new Subject<void>();
  
  resetSearch$ = this.resetSearchSubject.asObservable();
  
  triggerReset() {
    this.resetSearchSubject.next();
  }
}