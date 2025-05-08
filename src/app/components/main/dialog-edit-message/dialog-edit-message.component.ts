import {Component, ElementRef, EventEmitter, input, OnInit, Output, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatIcon} from '@angular/material/icon';
import {MessageDTO} from '../../../_models/MessageDTO';


@Component({
  selector: 'app-dialog-edit-message',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatIcon,
  ],
  templateUrl: './dialog-edit-message.component.html',
  styleUrl: './dialog-edit-message.component.css'
})
export class DialogEditMessageComponent implements OnInit {
  message = input<string>("");

  @Output() onClose = new EventEmitter<void>();
  @Output() onAppliedMessage = new EventEmitter<string>();
  private initialText = "";

  messageForm: FormGroup;

  constructor(
    private fb: FormBuilder)
  {
    this.messageForm = this.fb.group({
      messageTextArea: [this.message, Validators.required],

    });
  }

  messageEdit(text: string) {
    const checkText = text.trim();
    if(checkText !== "") {
      this.onAppliedMessage.emit(checkText);
    }
  }

  ngOnInit() {
    this.messageForm.patchValue({
      messageTextArea: this.message()
    });
    this.initialText = this.message();
  }
}
