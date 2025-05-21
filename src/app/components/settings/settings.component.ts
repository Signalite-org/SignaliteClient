import { Component, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProfileComponent } from "./profile/profile.component";
import { SecurityComponent } from './security/security.component';
import { CommonModule } from '@angular/common';
import { UserService } from '../../_services/user.service';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../_services/account.service';
import { ChangeImageComponent } from './change-image/change-image.component';
import { animate, style, transition, trigger } from '@angular/animations';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, MatIconModule, ProfileComponent, SecurityComponent, ChangeImageComponent, RouterModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
  standalone: true,
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms 0ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms 0ms', style({ opacity: 0 }))
      ])
    ]),
  ]
})
export class SettingsComponent implements OnInit {
  @ViewChild(ProfileComponent) private profileComponentRef?: ProfileComponent;
  
  protected currentForm: 'Profile' | 'Security' = 'Profile';

  protected previewProfileUrl?: string | ArrayBuffer | null = null;
  protected selectedFile: File | null = null;
  
  protected showImagePicker: boolean = false;
  protected imageChangeContext: 'profile' | 'background' = 'profile';
  
  protected isLoading: boolean = false;

  get ownUser() {
    return this.userService.ownUser();
  }

  constructor(private userService: UserService, private accountService: AccountService) {
    this.isLoading = true;
    this.userService.refreshOwnUser().subscribe({
      next: () => {
        this.previewProfileUrl = this.ownUser?.profilePhotoUrl;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err)
      }
    });
  }

  isMobileView = false;
  navbarVisible = false;

  ngOnInit() {
    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.checkScreenSize.bind(this));
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth <= 768;
    if (!this.isMobileView) {
      this.navbarVisible = false;
    }
  }

  toggleNavbar() {
    this.navbarVisible = !this.navbarVisible;
  }

  closeNavbar(){
    if(this.navbarVisible)
      this.navbarVisible = false
  }

  hideNavbarIfMobile() {

    if (this.isMobileView) {
      this.navbarVisible = false;
    }
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

    this.isLoading = true;
    if (this.imageChangeContext === "profile") {
      this.userService.updateProfilePhoto(formData).pipe(
        finalize(() => {
          this.isLoading = false;
          this.showImagePicker = false;
        })
      ).subscribe({
        next: () => {
          this.previewProfileUrl = URL.createObjectURL(file)
        },
        error: (err) => {
          console.error(err);
        }
      });
    } else {
      this.userService.updateBackgroundPhoto(formData).pipe(
        finalize(() => {
          this.isLoading = false;
          this.showImagePicker = false;
        })
      ).subscribe({
        next: () => {
          this.profileComponentRef?.setBackgroundImage(URL.createObjectURL(file));
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
  }

  onDefaultImageSelected() {
    this.isLoading = true;
    if (this.imageChangeContext === "profile") {
      this.userService.deleteProfilePhoto().pipe(
        finalize(() => {
          this.isLoading = false;
          this.showImagePicker = false;
        })
      ).subscribe({
        next: () => {
          this.previewProfileUrl = null;
        },
        error: (err) => {
          console.error(err);
        }
      });
    } else {
      this.userService.deleteBackgroundPhoto().pipe(
        finalize(() => {
          this.isLoading = false;
          this.showImagePicker = false;
        })
      ).subscribe({
        next: () => {
          this.profileComponentRef?.setBackgroundImage(null);
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
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
