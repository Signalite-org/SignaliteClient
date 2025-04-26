import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of, switchMap, take } from 'rxjs';
import { AccountService } from '../_services/account.service';

export const authGuard: CanActivateFn = (route, state) => {
  const accountService = inject(AccountService);
  const router = inject(Router);

  return accountService.currentUser$.pipe(
    take(1), // Bierzemy tylko pierwszą emisję
    switchMap(user => {
      // Jeśli mamy zalogowanego użytkownika, odswiez refresh token
      if (user) {
        accountService.refreshToken().pipe(
            map(() => true)
        )
      }

      // Sprawdź, czy mamy zapisanego użytkownika w localStorage
      const userString = localStorage.getItem('user');
      if (!userString) {
        // Brak danych użytkownika, przekieruj do logowania
        router.navigate(['/login']);
        return of(false);
      }

      // Spróbuj odświeżyć token
      return accountService.refreshToken().pipe(
        map(() => true), // Jeśli nie było błędu, zwracamy true
        catchError(() => {
          router.navigate(['/login']);
          return of(false);
        })
      );
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};