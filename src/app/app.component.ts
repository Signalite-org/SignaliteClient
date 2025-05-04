import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountService } from './_services/account.service';
import { IconRegistrator } from './_utils/icon-registrator.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  providers: [IconRegistrator]
})
export class AppComponent implements OnInit {
  title = 'SignaliteClient';

  constructor(private accountService: AccountService, private icons:IconRegistrator = inject(IconRegistrator)) {}

  ngOnInit(): void {
    // This will ensure the app tries to load user data from localStorage
    // on startup, which will help with the auth guard
    this.icons.registerIcons();
    console.log('App component initialized');
  }
}
