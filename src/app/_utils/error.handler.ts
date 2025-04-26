import { HttpErrorResponse } from "@angular/common/http";
import { ErrorResponse } from "../_models/ErrorResponse";
import { throwError } from "rxjs";

export function handleError(error: HttpErrorResponse) {
    let errorMessage = 'Wystąpił nieznany błąd';
    
    if (error.error instanceof ErrorEvent) {
      // Błąd po stronie klienta
      errorMessage = `Błąd: ${error.error.message}`;
    } else {
      // Błąd po stronie serwera
      // Mapujemy obiekt błędu z ASP.NET Core do naszego interfejsu
      try {
        // ASP.NET Core używa PascalCase, a TypeScript camelCase
        const serverError: ErrorResponse = {
          statusCode: error.error.StatusCode || error.status,
          message: error.error.Message || 'Brak szczegółów błędu',
          errors: error.error.Errors || []
        };
        
        console.log(serverError)
        
        errorMessage = serverError.message;
        
        // Jeśli są dostępne szczegółowe błędy, dodajemy je do komunikatu
        if (serverError.errors && serverError.errors.length > 0) {
          errorMessage += ': ' + serverError.errors.join(', ');
        }
      } catch (parsingError) {
        // Fallback, jeśli nie udało się sparsować ErrorResponse
        errorMessage = `Kod błędu: ${error.status}, Wiadomość: ${error.message}`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }