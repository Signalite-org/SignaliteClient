import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccountService } from '../_services/account.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const accountService = inject(AccountService);
  const router = inject(Router);
  
  return accountService.currentUser$.pipe(
    map(user => {
      if (user) {
        return true;
      } else {
        console.log('Access denied - Redirecting to login');
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
