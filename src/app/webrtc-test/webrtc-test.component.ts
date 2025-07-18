import { Component, DestroyRef, effect, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { WebRtcService } from '../_services/webrtc.service';
import { Subscription } from 'rxjs';
import { PresenceService } from '../_services/presence.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MediaDevice } from '../_models/WebRtc/MediaDevice';
import { UserBasicInfo } from '../_models/UserBasicInfo';
import { CallState } from '../_models/WebRtc/CallState';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CallInfo } from '../_models/WebRtc/CallInfo';

@Component({
  selector: 'app-webrtc-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './webrtc-test.component.html',
  styleUrl: './webrtc-test.component.css'
})
export class WebrtcTestComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);

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
  callState: CallState = CallState.Idle;
  logs: string[] = [];
  onlineUsers: UserBasicInfo[] = [];
  audioOnly = false;

  private subscriptions: Subscription[] = [];
  private localVideo: HTMLVideoElement | null = null;
  private remoteVideo: HTMLVideoElement | null = null;

  constructor(
    private webRtcService: WebRtcService,
    public presenceService: PresenceService
  ) {
    // Create an effect to track signals from the services
    effect(() => {
      this.audioDevices = this.webRtcService.audioDevices();
      this.videoDevices = this.webRtcService.videoDevices();
      this.callState = this.webRtcService.callState();
      this.onlineUsers = this.presenceService.onlineUsers();

      // Update initialization status based on having data
      if (this.audioDevices.length > 0 || this.videoDevices.length > 0) {
        this.initialized = true;
      }


    });

    effect(() => {
      const incomingCall = this.webRtcService.incomingCall();
      if (incomingCall)
        this.showIncomingCall(incomingCall)
    })
  }

  ngOnInit(): void {
    this.subscribeToEvents();
    this.initialize();
  }

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

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());

    // Stop media streams
    this.stopMedia();
  }

  subscribeToEvents(): void {
    // Subscribe to WebRTC logs
    this.webRtcService.logs$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(logs => {
        this.logs = logs;
      });

    // Subscribe to connection state changes
    this.webRtcService.connectionStateChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => {
        this.rtcConnectionState = state;
      });

    // Subscribe to call established (remote stream)
    this.webRtcService.callEstablished$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(stream => {
        if (this.remoteVideo) {
          this.remoteVideo.srcObject = stream;
        }
      });

    // Subscribe to call ended
    this.webRtcService.callEnded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.remoteVideo) {
          this.remoteVideo.srcObject = null;
        }
        this.localStreamActive = false;
      });

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
      this.logs.push('Initializing WebRTC...');
      await this.webRtcService.checkAvailableDevices();
      this.logs.push('WebRTC initialized');
      this.initialized = true;

      // Try to get video elements directly if needed
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

    // Request temporary permission to get device labels
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(track => track.stop()); // Stop tracks immediately
    } catch (error) {
      // Ignore errors, just try to get device list anyway
    }

    await this.webRtcService.checkAvailableDevices();
  }

  async showIncomingCall(call: CallInfo) {
    const confirmCall = window.confirm(`Incoming call from ${call.callerUsername}. Answer?`);
    if (confirmCall) {
      this.answerCall(call);
    } else {
      this.rejectCall(call);
    }
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

      // Get local stream first if not already active
      if (!this.localStreamActive) {
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
      }

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
      this.logs.push('Hanging up call...');
      this.stopMedia();

      if (this.remoteVideo && this.remoteVideo.srcObject) {
        this.remoteVideo.srcObject = null;
      }

      await this.webRtcService.hangUp();
      this.rtcConnectionState = null;
      this.logs.push('Call ended');

    } catch (error) {
      console.error('Failed to hang up:', error);
      this.logs.push(`Error hanging up: ${error}`);

      this.stopMedia();
      this.rtcConnectionState = null;
      if (this.remoteVideo) {
        this.remoteVideo.srcObject = null;
      }
    }
  }

  clearLogs(): void {
    this.logs = [];
  }
}