import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { CallState } from '../../../_models/WebRtc/CallState';
import { MediaDevice } from '../../../_models/WebRtc/MediaDevice';
import { WebRtcService } from '../../../_services/webrtc.service';

@Component({
  selector: 'app-active-call-window',
  standalone: true,
  imports: [CommonModule, MatIcon, FormsModule],
  templateUrl: './active-call-window.component.html',
  styleUrl: './active-call-window.component.css'
})
export class ActiveCallWindowComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;
  
  isMinimized = false;
  position = { x: 0, y: 0 };
  isDragging = false;
  dragOffset = { x: 0, y: 0 };
  
  // Call state
  callState = '';
  isCallActive = false;
  callDuration = '00:00';
  private callTimer: any;
  private callStartTime: number = 0;
  
  // Media state
  isAudioMuted = false;
  isVideoDisabled = false;
  hasLocalVideo = false;
  hasRemoteVideo = false;
  showDeviceSelection = false;
  
  // Devices
  audioDevices: MediaDevice[] = [];
  videoDevices: MediaDevice[] = [];
  selectedAudioDeviceId: string | null = null;
  selectedVideoDeviceId: string | null = null;
  
  private subscriptions: Subscription[] = [];
  
  constructor(private webRtcService: WebRtcService) {
    // Subscribe to call state changes
    effect(() => {
      const state = this.webRtcService.callState();
      this.callState = state;
      this.isCallActive = state !== CallState.Idle;
      
      if (state === CallState.Connected && !this.callTimer) {
        this.startCallTimer();
      } else if (state !== CallState.Connected && this.callTimer) {
        this.stopCallTimer();
      }
    });
    
    // Get devices
    effect(() => {
      this.audioDevices = this.webRtcService.audioDevices();
    });

    effect(() => {
      this.videoDevices = this.webRtcService.videoDevices();
    });
  }
  
  ngOnInit() {
    // Set up event listeners for call events
    this.subscriptions.push(
      this.webRtcService.callEstablished$.subscribe(stream => {
        if (this.remoteVideoRef?.nativeElement) {
          this.remoteVideoRef.nativeElement.srcObject = stream;
          this.hasRemoteVideo = stream.getVideoTracks().length > 0;
        }
      }),
      
      this.webRtcService.callEnded$.subscribe(() => {
        if (this.remoteVideoRef?.nativeElement) {
          this.remoteVideoRef.nativeElement.srcObject = null;
        }
        this.stopCallTimer();
        this.resetState();
      })
    );
    
    // Initialize videos if already in a call
    setTimeout(() => {
      this.initializeVideos();
    }, 500);
  }
  
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopCallTimer();
  }
  
  private initializeVideos() {
    // Check if local media stream exists and attach it
    const localStream = this.webRtcService.getLocalStream();
    if (localStream && this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.srcObject = localStream;
      this.hasLocalVideo = localStream.getVideoTracks().length > 0;
    }
  }
  
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }
  
  hangUp() {
    this.webRtcService.hangUp();
  }
  
  toggleMicrophone() {
    this.isAudioMuted = !this.isAudioMuted;
    this.webRtcService.toggleMicrophone(this.isAudioMuted);
  }
  
  toggleCamera() {
    this.isVideoDisabled = !this.isVideoDisabled;
    this.webRtcService.toggleCamera(this.isVideoDisabled);
  }
  
  onAudioDeviceChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedAudioDeviceId = selectElement.value;
    this.webRtcService.setSelectedAudioDevice(selectElement.value);
  }
  
  onVideoDeviceChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedVideoDeviceId = selectElement.value;
    this.webRtcService.setSelectedVideoDevice(selectElement.value);
  }
  
  async refreshDevices() {
    await this.webRtcService.checkAvailableDevices();
  }
  
  startDrag(event: MouseEvent) {
    this.isDragging = true;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.dragOffset.x = event.clientX - rect.left;
    this.dragOffset.y = event.clientY - rect.top;
    
    // Add event listeners for dragging
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDrag);
  }
  
  private onDrag = (event: MouseEvent) => {
    if (this.isDragging) {
      const callWindow = document.querySelector('.call-window') as HTMLElement;
      if (callWindow) {
        const x = event.clientX - this.dragOffset.x;
        const y = event.clientY - this.dragOffset.y;
        
        callWindow.style.right = 'auto';
        callWindow.style.bottom = 'auto';
        callWindow.style.left = `${x}px`;
        callWindow.style.top = `${y}px`;
      }
    }
  }
  
  private stopDrag = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  }
  
  private startCallTimer() {
    this.callStartTime = Date.now();
    this.callTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      this.callDuration = `${minutes}:${seconds}`;
    }, 1000);
  }
  
  private stopCallTimer() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    this.callDuration = '00:00';
  }
  
  private resetState() {
    this.isAudioMuted = false;
    this.isVideoDisabled = false;
    this.hasLocalVideo = false;
    this.hasRemoteVideo = false;
    this.showDeviceSelection = false;
  }
}
