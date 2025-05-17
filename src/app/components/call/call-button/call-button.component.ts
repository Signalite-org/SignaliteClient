import { CommonModule } from '@angular/common';
import { Component, effect, Input, OnInit } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { PresenceService } from '../../../_services/presence.service';
import { WebRtcService } from '../../../_services/webrtc.service';
import { CallState } from '../../../_models/WebRtc/CallState';

@Component({
  selector: 'app-call-button',
  standalone:true,
  imports: [CommonModule, MatIcon],
  templateUrl: './call-button.component.html',
  styleUrl: './call-button.component.css'
})
export class CallButtonComponent implements OnInit {
  @Input() otherUserId: number = 0;
  
  isUserOnline: boolean = false;
  callInProgress: boolean = false;
  
  constructor(
    private webRtcService: WebRtcService,
    private presenceService: PresenceService
  ) {
    effect(() => {
        const onlineUsers = this.presenceService.onlineUserIds()
        this.isUserOnline = this.presenceService.isUserOnline(this.otherUserId);
      });

    effect(() => {
      const newCallState = this.webRtcService.callState()
      this.callInProgress = newCallState !== CallState.Idle;
    });

  }
  
  ngOnInit() {
    // Check if the other user is online
    if (this.otherUserId > 0) {
      this.isUserOnline = this.presenceService.isUserOnline(this.otherUserId);
    }
    
  }
  
  initiateCall() {
    if (this.isUserOnline && !this.callInProgress && this.otherUserId > 0) {
      // Start local media stream first
      this.webRtcService.startLocalStream(false).then(() => {
        // Then initiate call
        this.webRtcService.startCall(this.otherUserId);
      }).catch(error => {
        console.error('Failed to get media:', error);
      });
    }
  }
}
