import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountService } from './_services/account.service';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent} from './components/main/main-layout/main-layout.component';
import { HeroiconService } from './_services/heroicons.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginComponent, MainLayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  providers: [HeroiconService]
})
export class AppComponent implements OnInit {
  title = 'SignaliteClient';

  constructor(private accountService: AccountService, private heroiconService:HeroiconService = inject(HeroiconService)) {
    this.heroiconService.registerIcons();
  }

  ngOnInit(): void {
    // This will ensure the app tries to load user data from localStorage
    // on startup, which will help with the auth guard
    this.heroiconService.registerIcons();
    console.log('App component initialized');
  }
}
