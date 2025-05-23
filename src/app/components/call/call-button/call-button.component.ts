import { CommonModule } from '@angular/common';
import { Component, computed, effect, Input, OnInit } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { PresenceService } from '../../../_services/presence.service';
import { WebRtcService } from '../../../_services/webrtc.service';
import { CallState } from '../../../_models/WebRtc/CallState';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-call-button',
  standalone:true,
  imports: [CommonModule, MatIcon,FormsModule],
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
      this.isUserOnline = this.onlineStatus();
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
      this.isUserOnline = this.presenceService.isUserOnline(this.otherUserId);
      this.onlineUserIds = this.presenceService.onlineUserIds();
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

  initiateCallWithOptions() {
    if (!this.canMakeCall()) return;
    
    this.showOptions = false;
    
    // If neither audio nor video enabled, make a listen-only call
    if (!this.audioEnabled && !this.videoEnabled) {
      this.initiateCallWithoutMedia();
      return;
    }
    
    this.startCall(false, this.audioEnabled, this.videoEnabled);
  }

  initiateCallWithoutMedia() {
    if (!this.canMakeCall()) return;
    
    this.webRtcService.startCallWithoutMedia(this.otherUserId)
      .catch(error => {
        console.error('Failed to start call without media:', error);
      });
  }

  private canMakeCall(): boolean {
    return this.isUserOnline && !this.callInProgress && this.otherUserId > 0;
  }

  private startCall(audioOnly: boolean, audioEnabled: boolean, videoEnabled: boolean) {
    // Determine if we should request video
    const requestVideo = !audioOnly && videoEnabled;
    
    this.webRtcService.startLocalStream(audioOnly || !videoEnabled)
      .then(stream => {
        if (stream) {
          // Set initial enabled state for tracks
          stream.getAudioTracks().forEach(track => {
            track.enabled = audioEnabled;
          });
          
          stream.getVideoTracks().forEach(track => {
            track.enabled = videoEnabled;
          });
        }
        
        // Start the call
        this.webRtcService.startCall(this.otherUserId);
      })
      .catch(error => {
        console.error('Failed to get media:', error);
        
        // Fallback strategies
        if (!audioOnly && videoEnabled) {
          // Try audio only
          console.log('Video failed, trying audio only...');
          this.startCall(true, audioEnabled, false);
        } else if (audioEnabled) {
          // If audio failed too, ask user if they want to join without media
          const joinWithoutMedia = confirm(
            'Cannot access microphone or camera. Join call to listen only?'
          );
          if (joinWithoutMedia) {
            this.initiateCallWithoutMedia();
          }
        }
      });
  }
}
