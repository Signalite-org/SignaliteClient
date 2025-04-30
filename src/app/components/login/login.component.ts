import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../_services/account.service';
import {Router, RouterOutlet} from '@angular/router';
import { LoginDTO } from '../../_models/LoginDTO';
import { CommonModule } from '@angular/common';
import { PresenceService } from '../../_services/presence.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterOutlet],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: true
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });

  }

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const loginData: LoginDTO = this.loginForm.value;
    console.log('Submitting login data:', loginData);

    this.accountService.login(loginData).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Login successful! Connected to presence hub. Check the console for hub events.';
        console.log('Login successful, waiting for SignalR connection...');
        this.router.navigate(['main'])

      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Invalid email or password. Please try again.';
        console.error('Login error:', error);
      }
    });
  }
}
