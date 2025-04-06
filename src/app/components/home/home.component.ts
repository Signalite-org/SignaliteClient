import { Component, OnInit } from '@angular/core';
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
  ) {}

  ngOnInit(): void {
    // Get current user ID
    this.accountService.currentUser$.subscribe(user => {
      if (user) {
        this.userId = user.userId;
        console.log('Home component loaded for user ID:', this.userId);
      }
    });

    // Get online users
    this.presenceService.onlineUserIds$.subscribe(users => {
      this.onlineUsers = users;
      console.log('Online users updated in home component:', users);
    });
  }

  logout(): void {
    this.accountService.logout();
  }
}