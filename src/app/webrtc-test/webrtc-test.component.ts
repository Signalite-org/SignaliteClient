import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { WebRtcService } from '../_services/webrtc.service';
import { Subscription } from 'rxjs';
import { PresenceService } from '../_services/presence.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MediaDevice } from '../_models/WebRtc/MediaDevice';
import { OnlineUser } from '../_models/WebRtc/OnlineUser';
import { UserBasicInfo } from '../_models/UserBasicInfo';

@Component({
  selector: 'app-webrtc-test',
  imports: [CommonModule, FormsModule],
  templateUrl: './webrtc-test.component.html',
  styleUrl: './webrtc-test.component.css'
})
export class WebrtcTestComponent implements OnInit, OnDestroy {
@ViewChild('localVideo', { static: true }) localVideoRef!: ElementRef<HTMLVideoElement>;
@ViewChild('remoteVideo', { static: true }) remoteVideoRef!: ElementRef<HTMLVideoElement>;

// store found devices
audioDevices: MediaDevice[] = [];
videoDevices: MediaDevice[] = [];
selectedAudioDeviceId: string | null = null;
selectedVideoDeviceId: string | null = null;

  initialized = false;
  localStreamActive = false;
  rtcConnectionState: RTCPeerConnectionState | null = null;
  callState: 'idle' | 'offering' | 'answering' | 'connected' | 'hangingUp' = 'idle';
  logs: string[] = [];
  onlineUsers: UserBasicInfo[] = [];
  audioOnly = false;
  
  private subscriptions: Subscription[] = [];
  private localVideo: HTMLVideoElement | null = null;
  private remoteVideo: HTMLVideoElement | null = null;

  constructor(
    private webRtcService: WebRtcService,
    public presenceService: PresenceService
  ) {}

  ngAfterViewInit() {
    this.logs.push('View initialized, getting video element references');
    this.localVideo = this.localVideoRef?.nativeElement;
    this.remoteVideo = this.remoteVideoRef?.nativeElement;
    
    if (this.localVideo) {
      this.logs.push('Local video element reference obtained successfully');
    } else {
      this.logs.push('ERROR: Failed to get reference to local video element');
    }
  }

  ngOnInit(): void {
    // Get references to video elements after view is initialized
    
    
    // Subscribe to WebRTC service events
    this.subscribeToEvents();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Stop media streams
    this.stopMedia();
    
    // Dispose of WebRTC resources if initialized
    if (this.initialized) {
      this.webRtcService.dispose();
    }
  }

  subscribeToEvents(): void {
    // Subscribe to WebRTC logs
    this.subscriptions.push(
      this.webRtcService.logs$.subscribe(logs => {
        this.logs = logs;
      })
    );

    this.subscriptions.push(
      this.webRtcService.audioDevices$.subscribe(devices => {
        this.audioDevices = devices;
        this.logs.push(`Found ${devices.length} audio input devices`);
      })
    );

    this.subscriptions.push(
      this.webRtcService.videoDevices$.subscribe(devices => {
        this.videoDevices = devices;
        this.logs.push(`Found ${devices.length} video input devices`);
      })
    );
    
    // Subscribe to connection state changes
    this.subscriptions.push(
      this.webRtcService.connectionStateChange$.subscribe(state => {
        this.rtcConnectionState = state;
      })
    );
    
    // Subscribe to call state changes
    this.subscriptions.push(
      this.webRtcService.callState$.subscribe(state => {
        this.callState = state;
      })
    );
    
    // Subscribe to online users
    this.subscriptions.push(
      this.presenceService.onlineUsersDetailed$.subscribe(users => {
        this.onlineUsers = users.map(u => ({
          id: u.id,
          username: u.username
        }));
      })
    );
    
    // Subscribe to call established (remote stream)
    this.subscriptions.push(
      this.webRtcService.callEstablished$.subscribe(stream => {
        if (this.remoteVideo) {
          this.remoteVideo.srcObject = stream;
        }
      })
    );
    
    // Subscribe to call ended
    this.subscriptions.push(
      this.webRtcService.callEnded$.subscribe(() => {
        if (this.remoteVideo) {
          this.remoteVideo.srcObject = null;
        }
      })
    );
    
    // Subscribe to incoming calls
    this.subscriptions.push(
      this.webRtcService.incomingCall$.subscribe(callInfo => {
        // If using a dialog, open it here
        const confirmCall = window.confirm(`Incoming call from ${callInfo.username}. Answer?`);
        if (confirmCall) {
          this.answerCall(callInfo);
        } else {
          this.rejectCall(callInfo);
        }
      })
    );
  }

  onAudioDeviceChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedAudioDeviceId = selectElement.value;
    this.webRtcService.setSelectedAudioDevice(selectElement.value);
    this.logs.push(`Selected audio device: ${selectElement.value}`);
  }
  
  onVideoDeviceChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedVideoDeviceId = selectElement.value;
    this.webRtcService.setSelectedVideoDevice(selectElement.value);
    this.logs.push(`Selected video device: ${selectElement.value}`);
  }

  async initialize(): Promise<void> {
    try {
      await this.webRtcService.initialize();
      this.initialized = true;
      await this.webRtcService.checkAvailableDevices();
      // Try to get video elements directly
      setTimeout(() => {
        if (!this.localVideo) {
          const localVideoElement = document.querySelector('video#localVideo') as HTMLVideoElement;
          if (localVideoElement) {
            this.localVideo = localVideoElement;
            this.logs.push('Found local video element using direct DOM query');
          } else {
            this.logs.push('WARNING: Could not find local video element');
          }
        }
        
        if (!this.remoteVideo) {
          const remoteVideoElement = document.querySelector('video#remoteVideo') as HTMLVideoElement;
          if (remoteVideoElement) {
            this.remoteVideo = remoteVideoElement;
            this.logs.push('Found remote video element using direct DOM query');
          }
        }
      }, 500);
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      this.logs.push(`Error initializing: ${error}`);
    }
  }

  async refreshDevices(): Promise<void> {
    this.logs.push('Refreshing device list...');
    await this.webRtcService.checkAvailableDevices();
  }

  async testMedia(): Promise<void> {
    try {
      this.logs.push('Checking available devices...');
      const devices = await this.webRtcService.checkAvailableDevices();
      
      if (!devices.hasVideo && !devices.hasAudio) {
        this.logs.push('ERROR: No camera or microphone detected on this device');
        return;
      }
      
      // Ensure we have the video element
      if (!this.ensureVideoElements()) {
        this.logs.push('ERROR: Video elements not ready yet. Please try again.');
        return;
      }
      
      this.logs.push(`Attempting to get ${this.audioOnly ? 'audio-only' : 'audio+video'} stream...`);
      const stream = await this.webRtcService.startLocalStream(this.audioOnly);
      
      this.localVideo!.srcObject = stream;
      this.localStreamActive = true;
      this.logs.push('Local stream attached to video element');
    } catch (error) {
      console.error('Failed to get media:', error);
      this.logs.push(`Error accessing media: ${error}`);
    }
  }

  private ensureVideoElements(): boolean {
    if (!this.localVideo && this.localVideoRef) {
      this.localVideo = this.localVideoRef.nativeElement;
      this.logs.push('Retrieved local video element reference');
    }
    
    if (!this.remoteVideo && this.remoteVideoRef) {
      this.remoteVideo = this.remoteVideoRef.nativeElement;
      this.logs.push('Retrieved remote video element reference');
    }
    
    return !!this.localVideo;
  }

  stopMedia(): void {
    if (this.localVideo && this.localVideo.srcObject) {
      const stream = this.localVideo.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.localVideo.srcObject = null;
      this.localStreamActive = false;
    }
  }

  async startCall(userId: number): Promise<void> {
    try {
      this.logs.push(`Attempting to start call with user ID: ${userId}`);
      
      // Get local stream first
      this.logs.push('Getting local stream...');
      const stream = await this.webRtcService.startLocalStream(this.audioOnly);
      this.logs.push(`Got local stream with ${stream.getTracks().length} tracks`);
      
      // Even if we can't attach it to the video element, we can still proceed with the call
      if (this.localVideo) {
        this.localVideo.srcObject = stream;
        this.logs.push('Attached stream to local video element');
      } else {
        this.logs.push('WARNING: Local video element not available, but continuing with call');
      }
      
      this.localStreamActive = true;
      
      // Start the call
      this.logs.push('Initiating call...');
      await this.webRtcService.startCall(userId);
    } catch (error) {
      console.error('Failed to start call:', error);
      this.logs.push(`Error starting call: ${error}`);
    }
  }

  async answerCall(callInfo: any): Promise<void> {
    try {
      if (!this.localStreamActive) {
        await this.testMedia();
      }
      await this.webRtcService.acceptCall(callInfo);
    } catch (error) {
      console.error('Failed to answer call:', error);
      this.logs.push(`Error answering call: ${error}`);
    }
  }

  async rejectCall(callInfo: any): Promise<void> {
    try {
      await this.webRtcService.rejectCall(callInfo);
    } catch (error) {
      console.error('Failed to reject call:', error);
      this.logs.push(`Error rejecting call: ${error}`);
    }
  }

  async hangUp(): Promise<void> {
    try {
      await this.webRtcService.hangUp();
    } catch (error) {
      console.error('Failed to hang up:', error);
      this.logs.push(`Error hanging up: ${error}`);
    }
  }

  clearLogs(): void {
    this.logs = [];
  }
}
