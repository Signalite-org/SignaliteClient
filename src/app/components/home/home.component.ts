import { Component, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../_services/account.service';
import { PresenceService } from '../../_services/presence.service';
import { NotificationsComponent } from "../../notifications/notifications.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NotificationsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  userId: number | null = null;
  onlineUsers: number[] = [];

  constructor(
    private accountService: AccountService,
    private presenceService: PresenceService
  ) 
  {
    this.userId = this.accountService.currentUser()?.userId ?? null;
    effect(() => {
      this.onlineUsers = this.presenceService.onlineUserIds();
      console.log('Online users updated in home component:', this.onlineUsers);
    });
  }

  ngOnInit(): void {
    
  }

  logout(): void {
    this.accountService.logout();
  }
}