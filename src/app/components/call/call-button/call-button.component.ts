import { CommonModule } from '@angular/common';
import { Component, computed, effect, Input, OnInit, signal } from '@angular/core';
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
  private _otherUserId = signal<number>(0);
  @Input() 
  set otherUserId(value: number) {
    this._otherUserId.set(value);
  }
  get otherUserId(): number {
    return this._otherUserId();
  }
  isUserOnline: boolean = false;
  callInProgress: boolean = false;
  showOptions: boolean = false;
  
  audioEnabled: boolean = true;
  videoEnabled: boolean = true;

  private onlineStatus = computed(() => {
    const onlineIds = this.presenceService.onlineUserIds();
    const userId = this._otherUserId(); // Use the signal
    const isOnline = userId > 0 && onlineIds.includes(userId);
    console.log(`[CallButton] User ${userId} online status: ${isOnline}`, onlineIds);
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
    
  }

  toggleOptions() {
    this.showOptions = !this.showOptions;
  }

  getButtonTooltip(): string {
    const userId = this._otherUserId();
    if (userId <= 0) return 'Invalid user';
    if (!this.isUserOnline) return 'User is offline';
    if (this.callInProgress) return 'Call in progress';
    return 'Start call';
  }
  
  initiateCall() {
    const userId = this._otherUserId();
    if (this.isUserOnline && !this.callInProgress && userId > 0) {
      // Start local media stream first
      this.webRtcService.startLocalStream(false).then(() => {
        // Then initiate call
        this.webRtcService.startCall(userId);
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
    
    const userId = this._otherUserId();
    this.webRtcService.startCallWithoutMedia(userId)
      .catch(error => {
        console.error('Failed to start call without media:', error);
      });
  }

 private canMakeCall(): boolean {
    const userId = this._otherUserId();
    return this.isUserOnline && !this.callInProgress && userId > 0;
  }

  private startCall(audioOnly: boolean, audioEnabled: boolean, videoEnabled: boolean) {
    // Determine if we should request video
    const requestVideo = !audioOnly && videoEnabled;
    const userId = this._otherUserId();
    
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
        this.webRtcService.startCall(userId);
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
