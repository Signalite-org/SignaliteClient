import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { LoginDTO } from '../../_models/LoginDTO';
import { RegisterDTO } from '../../_models/RegisterDTO';
import { CommonModule } from '@angular/common';
import { trigger, query, transition, style, animate } from '@angular/animations';
import { containsDigitsValidator, containsLowercaseValidator, containsSpecialCharactersValidator, containsUppercaseValidator, fieldsMatchValidator, notEmptyValidator } from '../../_utils/customValidators';
import { AccountService } from '../../_services/account.service';

@Component({
  selector: 'app-my-login',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: true,
  animations: [
    trigger('formSwitch', [
      transition('login => registerMain', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-100%)' }),
          animate('500ms ease', style({ opacity: 1, transform: 'translateX(0%)' }))
        ], { optional: true }),
        query(':leave', [
          animate('500ms ease', style({ opacity: 0, transform: 'translateX(100%)' }))
        ], { optional: true })
      ]),

      transition('registerMain => login', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(100%)' }),
          animate('500ms ease', style({ opacity: 1, transform: 'translateX(0%)' }))
        ], { optional: true }),
        query(':leave', [
          animate('500ms ease', style({ opacity: 0, transform: 'translateX(-100%)' }))
        ], { optional: true })
      ]),

      transition('registerExtra => login', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(100%)' }),
          animate('500ms ease', style({ opacity: 1, transform: 'translateX(0%)' }))
        ], { optional: true }),
        query(':leave', [
          animate('500ms ease', style({ opacity: 0, transform: 'translateX(-100%)' }))
        ], { optional: true })
      ])
    ])
  ]
})
export class LoginComponent {
  currentForm: 'login' | 'registerMain' | 'registerExtra' = 'login';

  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading: boolean = false;

  loginForm: FormGroup;
  loginEmailFocused: boolean = false;
  loginPasswordFocused: boolean = false;

  registerMainForm: FormGroup;
  registerMainEmailFocused: boolean = false;
  registerMainPasswordFocused: boolean = false;
  registerMainConfirmPasswordFocused: boolean = false;

  registerExtraForm: FormGroup;
  registerExtraUsernameFocused: boolean = false;
  registerExtraNameFocused: boolean = false;
  registerExtraSurnameFocused: boolean = false;

  readonly minLengthPassword: number = 8;
  readonly minLengthUsername: number = 4;
  readonly maxLengthUsername: number = 16;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    this.registerMainForm = this.fb.group({
      email: ['', [Validators.required, notEmptyValidator(), Validators.email]],
      password: ['', [Validators.required, notEmptyValidator(), Validators.minLength(this.minLengthPassword), containsLowercaseValidator(),
      containsUppercaseValidator(), containsSpecialCharactersValidator(), containsDigitsValidator()]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: fieldsMatchValidator('password', 'confirmPassword') });

    this.registerExtraForm = this.fb.group({
      username: ['', [Validators.required, notEmptyValidator(), Validators.minLength(this.minLengthUsername), Validators.maxLength(this.maxLengthUsername)]],
      name: ['', [Validators.required, notEmptyValidator()]],
      surname: ['', [Validators.required, notEmptyValidator()]],
    });
  }

  isMobile = window.innerWidth <= 1280;

  ngOnInit() {
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 1280;
    });
  }

  selectForm(form: 'login' | 'registerMain' | 'registerExtra') {
    if (!this.isLoading){
      this.errorMessage = null;
      this.successMessage = null;
      this.currentForm = form;

      switch (this.currentForm) {
        case 'login':
          this.loginForm.reset();
          break;
        case 'registerMain':
          this.registerMainForm.reset();
          break;
        case 'registerExtra':
          this.registerExtraForm.reset();
          break;
      }
    }
  }

  onSubmitLogin() {
    const loginData: LoginDTO = this.loginForm.value;

    this.isLoading = true;
    this.errorMessage = null;
    this.loginForm.disable();

    this.accountService.login(loginData).subscribe({
      next: () => {
        this.isLoading = false;
        this.loginForm.enable();

        console.log('Login successful, waiting for SignalR connection...');
        this.router.navigate(['main'])
      },
      error: (error) => {
        this.isLoading = false;
        this.loginForm.enable();

        if (error.status === 401) {
          this.errorMessage = 'Invalid email or password. Please try again.';
        } else {
          this.errorMessage = 'Unexpected error occurred. Please try again.';
        }

        console.error('Login error:', error);
      }
    });

    
  }

  onSubmitRegisterMain() {
    const email = this.registerMainForm.get('email')?.value;
    
    this.isLoading = true;
    this.errorMessage = null;
    this.registerMainForm.disable();

    this.accountService.existsUserByEmail(email).subscribe({
      next: (result: boolean) => {
        this.isLoading = false;
        this.registerMainForm.enable();

        if(!result){
          this.selectForm('registerExtra')
        }
        else {
          this.errorMessage = 'Email is used.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.registerMainForm.enable();

        this.errorMessage = 'Unexpected error occurred. Please try again.';
        console.error('RegisterMain error:', error);
      }
    })
  }

  onSubmitRegisterExtra() {
    const { email, password } = this.registerMainForm.value;
    const { username, name, surname } = this.registerExtraForm.value;

    let isUniqueUsername: boolean = false;
    const registerDto: RegisterDTO = {
      username,
      email,
      password,
      name,
      surname
    };

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.registerExtraForm.disable();

    this.accountService.existsUserByUsername(username).subscribe({
      next: (result: boolean) => {
        this.isLoading = false;
        
        if(!result){
          isUniqueUsername = true
          console.log(isUniqueUsername)
        }
        else {
          this.errorMessage = 'Username is used.';
        }

        if (isUniqueUsername) {
          this.accountService.register(registerDto).subscribe({
            next: () => {
              this.isLoading = false;
              this.successMessage = "Account is created."
              setTimeout(() => {
                this.registerExtraForm.enable();
                this.selectForm('login')
              }, 1000);
            },
            error: (error) => {
              this.isLoading = false;
              this.errorMessage = error.message;
              console.error('Login error:', error);
            }
          })
        }
        this.registerExtraForm.enable();
      },
      error: (error) => {
        this.isLoading = false;
        this.registerExtraForm.enable();

        this.errorMessage = error.message;
        console.error('Login error:', error);
      }
    })
  }
}
