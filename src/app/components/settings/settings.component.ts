import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileComponent } from "./profile/profile.component";
import { SecurityComponent } from './security/security.component';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { OwnUserDTO } from '../../_models/OwnUserDTO';
import { UserService } from '../../_services/user.service';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../_services/account.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, MatIconModule, ProfileComponent, SecurityComponent, RouterModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  currentForm: 'Profile' | 'Security' = 'Profile';
  previewUrl: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  isLoading: boolean = false;

  readonly ownUserInfo;

  constructor(private userService: UserService, private accountService: AccountService) {
    this.ownUserInfo = this.userService.ownUser

    this.isLoading = true;
    this.userService.refreshOwnUser().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err)
      }
    });
  }

  ngOnInit(): void {

  }

  selectForm(form: 'Profile' | 'Security') {
    this.currentForm = form;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.selectedFile = input.files[0];

      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  logout(): void {
    this.accountService.logout();
  }
}
