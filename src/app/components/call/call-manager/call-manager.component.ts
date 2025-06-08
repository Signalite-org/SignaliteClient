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
  standalone: true,
  imports: [CommonModule, IncomingCallDialogComponent, ActiveCallWindowComponent],
  templateUrl: './call-manager.component.html',
  styleUrl: './call-manager.component.css'
})
export class CallManagerComponent implements OnInit, OnDestroy {
  incomingCall: CallInfo | null = null;
  isCallActive = false;

  private subscriptions: Subscription[] = [];
  private audio = new Audio();

  constructor(private webRtcService: WebRtcService) {
    this.audio.src = "assets/images/br_br_patapim.mp3"
    effect(() => {
      this.incomingCall = this.webRtcService.incomingCall();
    });

    effect(() => {
      const state = this.webRtcService.callState();
      this.isCallActive = state !== CallState.Idle;

      // Clear incoming call when call is established or ended
      if (state !== CallState.Incoming) {
        this.incomingCall = null;
        this.audio.pause();
        this.audio.currentTime = 0;
      }

      if (state === CallState.Incoming) {
        this.audio.play()
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
  console.log('[CallManager] Accepting call from:', call.callerUsername);
  
  // Try to get full media first
  this.webRtcService.startLocalStream(false)
    .then(() => {
      console.log('[CallManager] Full media (audio + video) acquired successfully');
      this.webRtcService.acceptCall(call);
    })
    .catch(fullMediaError => {
      console.log('[CallManager] Full media failed, trying audio only:', fullMediaError);
      
      // If full media fails, try audio only
      this.webRtcService.startLocalStream(true)
        .then(() => {
          console.log('[CallManager] Audio-only media acquired successfully');
          this.webRtcService.acceptCall(call);
        })
        .catch(audioError => {
          console.log('[CallManager] Audio-only also failed:', audioError);
          
          // If both fail, show options to user
          this.showMediaFailureOptions(call, fullMediaError, audioError);
        });
    });
}

private showMediaFailureOptions(call: CallInfo, videoError: any, audioError: any) {
  const isDeviceInUse = videoError.name === 'NotReadableError' || 
                       audioError.name === 'NotReadableError' ||
                       videoError.message?.includes('in use') ||
                       audioError.message?.includes('in use');
  
  let message = `Cannot access camera or microphone`;
  if (isDeviceInUse) {
    message += ` (devices may be in use by another application/tab)`;
  }
  message += `.\n\nWould you like to:\n`;
  
  const options = [
    'Join call to listen only (recommended)',
    'Try joining with muted microphone and camera',
    'Decline the call'
  ];
  
  const choice = prompt(
    `${message}\n` +
    `1. ${options[0]}\n` +
    `2. ${options[1]}\n` +
    `3. ${options[2]}\n\n` +
    `Enter 1, 2, or 3:`
  );
  
  switch(choice) {
    case '1':
      console.log('[CallManager] User chose to join listen-only');
      this.webRtcService.acceptCallWithoutMedia(call);
      break;
    case '2':
      console.log('[CallManager] User chose to join with muted media');
      this.acceptWithMutedMedia(call);
      break;
    default:
      console.log('[CallManager] User declined call');
      this.declineCall(call);
      break;
  }
}

private async acceptWithMutedMedia(call: CallInfo) {
  try {
    // Create a minimal media stream for the peer connection
    const mutedStream = await this.createMinimalMediaStream();
    
    // Set this as the local stream in WebRTC service
    this.webRtcService.setLocalStream(mutedStream);
    
    // Accept the call with this muted stream
    await this.webRtcService.acceptCall(call);
    
    console.log('[CallManager] Accepted call with muted media stream');
  } catch (error) {
    console.error('[CallManager] Failed to accept with muted media:', error);
    // Final fallback
    this.webRtcService.acceptCallWithoutMedia(call);
  }
}

// Create a minimal media stream that doesn't require device access
private async createMinimalMediaStream(): Promise<MediaStream> {
  // Create silent audio track using AudioContext
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  // Don't start any oscillator - just use the empty destination
  
  // Create minimal black video
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 1, 1);
  }
  
  const videoStream = canvas.captureStream(1);
  
  // Combine into one stream
  const stream = new MediaStream([
    ...destination.stream.getAudioTracks(),
    ...videoStream.getVideoTracks()
  ]);
  
  // Start with tracks disabled
  stream.getAudioTracks().forEach(track => track.enabled = false);
  stream.getVideoTracks().forEach(track => track.enabled = false);
  
  return stream;
}

  private acceptCallWithoutMedia(call: CallInfo) {
    console.log('[CallManager] Accepting call without media');
    this.webRtcService.acceptCallWithoutMedia(call)
      .catch(error => {
        console.error('[CallManager] Failed to accept call without media:', error);
        this.declineCall(call);
      });
  }

  declineCall(call: CallInfo) {
    this.webRtcService.rejectCall(call);
    this.incomingCall = null;
  }
}

