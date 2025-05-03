import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { catchError, first, map, Observable, of } from 'rxjs';
import { AccountService } from '../_services/account.service';

export function fieldsMatchValidator(field1: string, field2: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const value1 = formGroup.get(field1)?.value;
    const value2 = formGroup.get(field2)?.value;

    if (value1 !== value2) {
      return { fieldsMismatch: true };
    }
    
    return null;
  };
}

export function notEmptyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    
    if (typeof value === 'string' && value.trim() === '') {
      return { isEmpty: true };
    }

    return null;
  };
}

export function containsLowercaseValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    
    if (!/[a-z]/.test(value)) {
      return { lowercase: true };
    }

    return null;
  };
}

export function containsUppercaseValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    
    if (!/[A-Z]/.test(value)) {
      return { uppercase: true };
    }

    return null;
  };
}

export function containsSpecialCharactersValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    
    if (!/[@$!%*?&.\^]/.test(value)) {
      return { special: true };
    }

    return null;
  };
}

export function containsDigitsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    
    if (!/[\d]/.test(value)) {
      return { digits: true };
    }

    return null;
  };
}

// export function isUsernameUnique(accountService: AccountService) : AsyncValidatorFn {
//   return (control: AbstractControl) => {
//     const username = control.value?.trim();

//     if (!username) {
//       return of(null);
//     }

//     return accountService.existsUserByUsername(username).pipe(
//       map(exists => (exists ? { usernameTaken: true } : null)),
//       catchError(() => of(null)),
//       first()
//     );
//   };
// }

// export function isEmailUnique(accountService: AccountService) : AsyncValidatorFn {
//   return (control: AbstractControl): Observable<ValidationErrors | null> => {
//     const email = control.value?.trim();

//     if (!email) {
//       return of(null);
//     }

//     return accountService.existsUserByEmail(email).pipe(
//       map(exists => (exists ? { emailTaken: true } : null)),
//       catchError(() => of(null)),
//       first()
//     );
//   };
// }