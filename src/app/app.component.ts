import {Component, inject, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent} from './components/main/main-layout/main-layout.component';
import {HeroiconService} from './_services/heroicons.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginComponent, MainLayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  providers: [HeroiconService]
})
export class AppComponent implements OnInit {
  constructor(private heroiconService:HeroiconService = inject(HeroiconService)) {
    this.heroiconService.registerIcons();
  }
  ngOnInit() {
    this.heroiconService.registerIcons();
  }
  title = 'SignaliteClient';
}
