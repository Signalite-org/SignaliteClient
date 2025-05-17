import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { containsDigitsValidator, containsLowercaseValidator, containsSpecialCharactersValidator, containsUppercaseValidator, fieldsMatchValidator, notEmptyValidator } from '../../../_utils/customValidators';
import { ChangePasswordDTO } from '../../../_models/ChangePasswordDTO';
import { UserService } from '../../../_services/user.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-security',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './security.component.html',
  styleUrl: './security.component.css'
})
export class SecurityComponent {
  protected changePasswordForm: FormGroup;
  protected oldPasswordFocused: boolean = false;
  protected newPasswordFocused: boolean = false;
  protected confirmNewPasswordFocused: boolean = false;

  protected isLoading: boolean = false;
  protected errorMessage: string | null = null;
  protected successMessage: string | null = null;

  protected readonly minLengthPassword: number = 8;

  constructor(private fb: FormBuilder, private userService: UserService) {
    this.changePasswordForm = this.fb.group({
      oldPassword: ['',[Validators.required, notEmptyValidator()]],
      newPassword: ['',[Validators.required, notEmptyValidator(), Validators.minLength(this.minLengthPassword), containsLowercaseValidator(),
      containsUppercaseValidator(), containsSpecialCharactersValidator(), containsDigitsValidator()]],
      confirmNewPassword: ['',[]]
    }, {validators: fieldsMatchValidator('newPassword', 'confirmNewPassword')});
  }

  onSubmitChangePassword() {
      const { oldPassword, newPassword } = this.changePasswordForm.value;

      const changePasswordData: ChangePasswordDTO = {
        oldPassword,
        newPassword
      };

      this.isLoading = true;
      this.errorMessage = null;
      this.changePasswordForm.disable();
  
      this.userService.changePassword(changePasswordData).pipe(
        finalize(() => {
          this.isLoading = false;
          this.changePasswordForm.enable();
        })
      ).subscribe({
        next: () => {
          this.successMessage = "Password updated successfully."
        },
        error: (error) => {
          if(error.status === 400){
            this.errorMessage = error?.error?.Message;
          }    
          else{
            this.errorMessage = 'Unexpected error occurred. Please try again.';
          }
          console.error(error);
        }
      });
    }
}
