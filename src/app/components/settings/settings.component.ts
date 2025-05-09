import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileComponent } from "./profile/profile.component";
import { SecurityComponent } from './security/security.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, MatIconModule, ProfileComponent, SecurityComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit{
  currentForm: 'Profile' | 'Security'  = 'Profile';

  constructor() {}

  ngOnInit(): void {
    
  }

  select(form: 'Profile' | 'Security') {
    this.currentForm = form;
  }
}
