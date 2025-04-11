import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { trigger, query,state,transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-my-login',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './my-login.component.html',
  styleUrl: './my-login.component.css',
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms 500ms', style({ opacity: 1 })) // 200ms opóźnienia
      ]),
      transition(':leave', [
        animate('500ms 0ms', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class MyLoginComponent {
  currentForm: 'login' | 'registerMain' | 'registerExtra' = 'login';

  toggleForm(form: 'login' | 'registerMain' | 'registerExtra') {
    this.currentForm = form;
  }
}
