import { Component, signal, OnInit, OnDestroy, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { SearchResetService } from '../../../_utils/search-reset.service';

@Component({
  selector: 'app-friend-group-search',
  imports: [
    MatIcon,
  ],
  templateUrl: './group-friend-search.component.html',
  styleUrl: './group-friend-search.component.scss',
})
export class GroupFriendSearchComponent implements OnInit, OnDestroy {
  groupText = signal("");
  searchTextChanged = output<string>();
  private subscription: Subscription = new Subscription();
  
  constructor(private searchResetService: SearchResetService) {}
  
  ngOnInit() {
    // Nasłuchuj zdarzenia resetowania
    this.subscription = this.searchResetService.resetSearch$.subscribe(() => {
      this.groupText.set("");
      this.searchTextChanged.emit("");
      
      // Dodatkowo zresetuj wartość pola input w DOM
      const inputElement = document.querySelector('input') as HTMLInputElement;
      if (inputElement) {
        inputElement.value = "";
      }
    });
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  onInputChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.groupText.set(value);
    this.searchTextChanged.emit(value);
  }
}