import { CommonModule } from '@angular/common';
import { Component, computed, effect, Input, OnInit } from '@angular/core';
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
  showOptions: boolean = false;
  onlineUserIds: number[] = []; // For debugging
  
  audioEnabled: boolean = true;
  videoEnabled: boolean = true;

  private onlineStatus = computed(() => {
    const onlineIds = this.presenceService.onlineUserIds();
    const isOnline = this.otherUserId > 0 && onlineIds.includes(this.otherUserId);
    console.log(`[CallButton] User ${this.otherUserId} online status: ${isOnline}`, onlineIds);
    return isOnline;
  });

  constructor(
    private webRtcService: WebRtcService,
    private presenceService: PresenceService
  ) {
    effect(() => {
        const onlineUsers = this.presenceService.onlineUserIds()
        this.isUserOnline = this.onlineStatus();
        console.log(`[CallButton] Effect triggered - User ${this.otherUserId} is ${this.isUserOnline ? 'online' : 'offline'}`);
      });

    effect(() => {
      const newCallState = this.webRtcService.callState()
      this.callInProgress = newCallState !== CallState.Idle;

      if (this.callInProgress) {
        this.showOptions = false;
      }
    });

  }
  
  ngOnInit() {
    // Check if the other user is online
    setTimeout(() => {
      this.checkOnlineStatus();
    }, 500);
    
  }

  toggleOptions() {
    this.showOptions = !this.showOptions;
  }

  private checkOnlineStatus() {
    if (this.otherUserId > 0) {
      const wasOnline = this.isUserOnline;
      this.isUserOnline = this.presenceService.isUserOnline(this.otherUserId);
      this.onlineUserIds = this.presenceService.onlineUserIds();
      
      if (wasOnline !== this.isUserOnline) {
        console.log(`[CallButton] Online status changed for user ${this.otherUserId}: ${wasOnline} -> ${this.isUserOnline}`);
      }
    }
  }

  getButtonTooltip(): string {
    if (this.otherUserId <= 0) return 'Invalid user';
    if (!this.isUserOnline) return 'User is offline';
    if (this.callInProgress) return 'Call in progress';
    return 'Start call';
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
