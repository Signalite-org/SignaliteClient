import { CommonModule } from '@angular/common';
import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CallInfo } from '../../../_models/WebRtc/CallInfo';
import { CallState } from '../../../_models/WebRtc/CallState';
import { WebRtcService } from '../../../_services/webrtc.service';
import { ActiveCallWindowComponent } from '../active-call-window/active-call-window.component';
import { IncomingCallDialogComponent } from '../incoming-call-dialog/incoming-call-dialog.component';

@Component({
  selector: 'app-call-manager',
  standalone:true,
  imports: [CommonModule, IncomingCallDialogComponent, ActiveCallWindowComponent],
  templateUrl: './call-manager.component.html',
  styleUrl: './call-manager.component.css'
})
export class CallManagerComponent implements OnInit, OnDestroy {
  incomingCall: CallInfo | null = null;
  isCallActive = false;
  
  private subscriptions: Subscription[] = [];
  
  constructor(private webRtcService: WebRtcService) {
    effect(() => {
      this.incomingCall = this.webRtcService.incomingCall();
    });
    
    effect(() => {
      const state = this.webRtcService.callState();
      this.isCallActive = state !== CallState.Idle;
      
      // Clear incoming call when call is established or ended
      if (state !== CallState.Incoming) {
        this.incomingCall = null;
      }
    });
  }
  
  ngOnInit() {
    // Initialize WebRTC service if not already initialized
    this.webRtcService.initialize().catch(error => {
      console.error('Error initializing WebRTC:', error);
    });
    
  }
  
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  acceptCall(call: CallInfo) {
    // Start local media
    this.webRtcService.startLocalStream().then(() => {
      // Accept call
      this.webRtcService.acceptCall(call);
    }).catch(error => {
      console.error('Error starting media for call:', error);
    });
  }
  
  declineCall(call: CallInfo) {
    this.webRtcService.rejectCall(call);
    this.incomingCall = null;
  }
}

