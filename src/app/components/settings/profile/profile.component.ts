import { CommonModule } from '@angular/common';
import { Component, effect, EventEmitter, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { notEmptyValidator } from '../../../_utils/customValidators';
import { catchError, finalize, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { UserDTO } from '../../../_models/UserDTO';
import { UserService } from '../../../_services/user.service';
import { OwnUserDTO } from '../../../_models/OwnUserDTO';
import { ModifyUserDTO } from '../../../_models/ModifyUserDTO';
import { AccountService } from '../../../_services/account.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  @Output() backgroundChangeRequested = new EventEmitter<void>();
  previewBackgroundUrl?: string | ArrayBuffer | null = null;

  profileForm: FormGroup;
  profileUsernameFocused: boolean = false;
  profileEmailFocused: boolean = false;
  profileNameFocused: boolean = false;
  profileSurnameFocused: boolean = false;

  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  readonly minLengthUsername: number = 4;
  readonly maxLengthUsername: number = 16;

  readonly ownUser;

  constructor(private fb: FormBuilder, private userService: UserService, private accountService: AccountService) {
    this.ownUser = this.userService.ownUser;

    this.profileForm = this.fb.group({
      username: ['', [Validators.required, notEmptyValidator(), Validators.minLength(this.minLengthUsername), Validators.maxLength(this.maxLengthUsername)]],
      email: ['', [Validators.required, notEmptyValidator(), Validators.email]],
      name: ['', [Validators.required, notEmptyValidator()]],
      surname: ['', [Validators.required, notEmptyValidator()]]
    });

    effect(() => {
      const userData = this.ownUser();
      if (userData) {
        this.profileForm.patchValue(userData);
        console.log(userData)
        this.previewBackgroundUrl = userData.backgroundPhotoUrl;
      }
    });
  }

  ngOnInit() { }

  requestBackgroundChange() {
    this.backgroundChangeRequested.emit();
  }

  setBackgroundImage(imageDataUrl: string | ArrayBuffer | null | undefined) {
    this.previewBackgroundUrl = imageDataUrl;
  }

  onSubmitUpdateProfile() {
    const loginData: ModifyUserDTO = this.profileForm.value;

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.profileForm.disable();

    let step = '';
    let isUsernameTaken = false;
    let isEmailTaken = false;
    this.accountService.existsUserByUsername(loginData.username).pipe(
      tap(() => step = 'existsUserByUsername'),
      switchMap((usernameExists: boolean) => {
        if(this.ownUser()?.username !== loginData.username)
          isUsernameTaken = usernameExists;
        return this.accountService.existsUserByEmail(loginData.email);
      }),
      tap(() => step = 'existsUserByEmail'),
      switchMap((emailExists: boolean) => {
        if(this.ownUser()?.email !== loginData.email)
          isEmailTaken = emailExists;

        if (isUsernameTaken && isEmailTaken) {
          this.errorMessage = 'Username and email are already used.';
          return throwError(() => new Error('Username and email are used.'));
        }

        if (isUsernameTaken) {
          this.errorMessage = 'Username is already taken.';
          return throwError(() => new Error('Username is used.'));
        }

        if (isEmailTaken) {
          this.errorMessage = 'Email is already taken.';
          return throwError(() => new Error('Email is used.'));
        }

        return this.userService.modifyUser(loginData);
      }),
      tap(() => step = 'modifyUser'),
      tap(() => {
        this.successMessage = 'User updated successfully.';
      }),
      catchError(err => {
        if(!this.errorMessage)
          this.errorMessage = 'Unexpected error occurred. Please try again.';
        
        console.error(`${step}:`, err.message);
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
        this.profileForm.enable();
      })
    ).subscribe();

  }

  onSubmitupdateBackground() {

  }
}
