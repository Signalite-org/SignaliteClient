import { HttpInterceptorFn } from '@angular/common/http';
import { AccountService } from '../_services/account.service';
import { inject } from '@angular/core';
import { take } from 'rxjs';

export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
  const accountService = inject(AccountService);
  
  // Skip adding auth header for login/register
  if (request.url.includes('api/auth/login') || request.url.includes('api/auth/register')) {
    return next(request);
  }

  let currentUser: any;
  accountService.currentUser$.pipe(take(1)).subscribe(user => currentUser = user);
  
  if (currentUser) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${currentUser.accessToken}`
      }
    });
  }
  
  return next(request);
};
