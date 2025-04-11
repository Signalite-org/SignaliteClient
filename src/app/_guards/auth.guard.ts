import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of, switchMap, take } from 'rxjs';
import { AccountService } from '../_services/account.service';

export const authGuard: CanActivateFn = (route, state) => {
  const accountService = inject(AccountService);
  const router = inject(Router);
  const currentUser = accountService.currentUser();

  if (currentUser) {
    // User exists in signal, refresh token to ensure it's valid
    return accountService.refreshToken().pipe(
      map(() => true),
      catchError(() => {
        router.navigate(['/login']);
        return of(false);
      })
    );
  } else {
    // No user in signal, check localStorage as fallback
    const userString = localStorage.getItem('user');
    if (!userString) {
      // No user data, redirect to login
      router.navigate(['/login']);
      return of(false);
    }
    
    // User exists in localStorage but not in signal
    // Try to refresh token
    return accountService.refreshToken().pipe(
      map(() => true),
      catchError(() => {
        router.navigate(['/login']);
        return of(false);
      })
    );
  }
};