import { Component, OnInit } from '@angular/core';
import { AccountService } from '../../_services/account.service';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-auto-login',
  imports: [],
  templateUrl: './auto-login.component.html',
  styleUrl: './auto-login.component.css'
})
export class AutoLoginComponent implements OnInit {
  constructor(private accountService: AccountService, private router: Router) {}

  ngOnInit() {
    // Sprawdź, czy mamy już zalogowanego użytkownika
    if (this.accountService.currentUser()) {
      this.router.navigateByUrl('/home');
      return;
    }

    // Próba odświeżenia tokenu
    this.accountService.refreshToken().pipe(
      catchError(error => {
        console.error('Auto login failed', error);
        this.router.navigateByUrl('/login');
        return of(null);
      })
    ).subscribe({
      next: () => {
        if (this.accountService.currentUser()) {
          this.router.navigateByUrl('/home');
        } else {
          this.router.navigateByUrl('/login');
        }
      }
    });
  }
}
