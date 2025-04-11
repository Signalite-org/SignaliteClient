import { Component} from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../../_services/account.service';
import { PresenceService } from '../../_services/presence.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router, private accountService: AccountService, private presenceService: PresenceService){}
  
  navigateToFriendsComponent(){
    this.router.navigateByUrl('/friends')
  }

}
