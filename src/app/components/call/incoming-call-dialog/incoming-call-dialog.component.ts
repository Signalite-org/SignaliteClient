import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { CallInfo } from '../../../_models/WebRtc/CallInfo';

@Component({
  selector: 'app-incoming-call-dialog',
  standalone: true,
  imports: [CommonModule, MatIcon],
  templateUrl: './incoming-call-dialog.component.html',
  styleUrl: './incoming-call-dialog.component.css'
})
export class IncomingCallDialogComponent {
  @Input() call: CallInfo | null = null;
  @Output() accept = new EventEmitter<CallInfo>();
  @Output() decline = new EventEmitter<CallInfo>();
  
  onAccept() {
    if (this.call) {
      this.accept.emit(this.call);
    }
  }
  
  onDecline() {
    if (this.call) {
      this.decline.emit(this.call);
    }
  }
}
