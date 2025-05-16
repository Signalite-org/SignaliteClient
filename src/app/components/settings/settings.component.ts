import { Component, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileComponent } from "./profile/profile.component";
import { SecurityComponent } from './security/security.component';
import { CommonModule } from '@angular/common';
import { UserService } from '../../_services/user.service';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../_services/account.service';
import { ChangeImageComponent } from './change-image/change-image.component';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, MatIconModule, ProfileComponent, SecurityComponent, ChangeImageComponent, RouterModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  currentForm: 'Profile' | 'Security' = 'Profile';
  previewProfileUrl?: string | ArrayBuffer | null = null;

  selectedFile: File | null = null;
  isLoading: boolean = false;

  showImagePicker: boolean = false;
  imageChangeContext: 'profile' | 'background' | null = null;
  @ViewChild(ProfileComponent) profileComponentRef?: ProfileComponent;

  readonly ownUserInfo;

  constructor(private userService: UserService, private accountService: AccountService) {
    this.ownUserInfo = this.userService.ownUser;

    this.isLoading = true;
    this.userService.refreshOwnUser().subscribe({
      next: () => {
        this.previewProfileUrl = this.userService.ownUser()?.profilePhotoUrl;
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

  get defaultImage(): string {
    return this.imageChangeContext === 'profile' 
      ? 'assets/images/default-user.jpg' 
      : 'assets/images/background0.png';
  }

  get shape(): 'circle' | 'rectangle' {
    return this.imageChangeContext === 'profile' ? 'circle' : 'rectangle';
  }

  onImageSelected(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    if(this.imageChangeContext === "profile"){
      this.userService.updateProfilePhoto(formData).subscribe({
          next: () => {
            this.previewProfileUrl = URL.createObjectURL(file)
          },
          error: (err) => {
            console.error(err);
          }
      });
    } else if(this.imageChangeContext === "background"){
      this.userService.updateBackgroundPhoto(formData).subscribe({
          next: () => {
            this.profileComponentRef?.setBackgroundImage(URL.createObjectURL(file));
            console.log("yes")
          },
          error: (err) => {
            console.error(err);
          }
      });
    }
    
    this.showImagePicker = false;
  }

  onDefaultImageSelected() {
    if(this.imageChangeContext === "profile"){
      this.userService.deleteProfilePhoto().subscribe({
        next: () => {
          this.previewProfileUrl = null;
        },
        error: (err) => {
          console.error(err);
        }
    });
    } else if(this.imageChangeContext == "background"){
      this.userService.deleteBackgroundPhoto().subscribe({
        next: () => {
          this.profileComponentRef?.setBackgroundImage(null);
        },
        error: (err) => {
          console.error(err);
        }
    });
    }
    

    this.showImagePicker = false;
  }

  onProfileChangeRequested(): void {
    this.imageChangeContext = 'profile';
    this.showImagePicker = true;
  }

  onBackgroundChangeRequested(): void {
    this.imageChangeContext = 'background';
    this.showImagePicker = true;
  }

  logout(): void {
    this.accountService.logout();
  }
}
