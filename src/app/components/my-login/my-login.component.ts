import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { trigger, query,state,transition, style, animate, group } from '@angular/animations';

@Component({
  selector: 'app-my-login',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './my-login.component.html',
  styleUrl: './my-login.component.css',
  animations: [
    trigger('formSwitch', [
      transition('login => registerMain', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-100%)' }),
          animate('500ms ease', style({ opacity: 1, transform: 'translateX(0%)' }))
        ], { optional: true }),
        query(':leave', [
          animate('500ms ease', style({ opacity: 0, transform: 'translateX(100%)' }))
        ], { optional: true })
      ]),

      transition('registerMain => login', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(100%)' }),
          animate('500ms ease', style({ opacity: 1, transform: 'translateX(0%)' }))
        ], { optional: true }),
        query(':leave', [
          animate('500ms ease', style({ opacity: 0, transform: 'translateX(-100%)' }))
        ], { optional: true })
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