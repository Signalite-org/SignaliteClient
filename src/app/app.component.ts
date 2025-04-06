import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AccountService } from './_services/account.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  title = 'SignaliteClient';

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    // This will ensure the app tries to load user data from localStorage
    // on startup, which will help with the auth guard
    console.log('App component initialized');
  }
}
