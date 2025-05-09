import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  profileFrom: FormGroup;

  constructor(private fb: FormBuilder) {
    this.profileFrom = this.fb.group({
      username: [''],
      email: [''],
      name: [''],
      surname: ['']
    });
  }
}
