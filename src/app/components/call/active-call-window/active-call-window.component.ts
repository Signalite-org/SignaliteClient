import { CommonModule } from '@angular/common';
import { Component, effect, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  hasRemoteVideo = false
  hasLocalAudio = false;;
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

    setInterval(() => {
      this.updateMediaState();
    }, 1000);
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
        this.resetPosition();
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
    this.removeDragListeners();
  }

  // Listen for window resize to adjust position if needed
  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.constrainToViewport();
  }
  
  private initializeVideos() {
    // Check if local media stream exists and attach it
    const localStream = this.webRtcService.getLocalStream();
    if (localStream && this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.srcObject = localStream;
      this.hasLocalVideo = localStream.getVideoTracks().length > 0;
      this.updateMediaState();
    }
  }
  
  private updateMediaState() {
    const mediaState = this.webRtcService.getMediaState();
    this.isAudioMuted = mediaState.audioMuted;
    this.isVideoDisabled = mediaState.videoDisabled;
    this.hasLocalVideo = mediaState.hasVideo;
    this.hasLocalAudio = mediaState.hasAudio;
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }
  
  hangUp() {
    this.webRtcService.hangUp();
  }
  
  toggleMicrophone() {
    const newMutedState = !this.isAudioMuted;
    this.webRtcService.toggleMicrophone(newMutedState);
    // Update state immediately for better UX
    this.isAudioMuted = newMutedState;
  }
  
  toggleCamera() {
    const newDisabledState = !this.isVideoDisabled;
    this.webRtcService.toggleCamera(newDisabledState);
    // Update state immediately for better UX
    this.isVideoDisabled = newDisabledState;
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
    // Check if the click target is a button or control element
    const target = event.target as HTMLElement;
    const isButton = target.closest('button') || 
                     target.closest('.control-btn') || 
                     target.closest('mat-icon') ||
                     target.tagName === 'BUTTON' ||
                     target.classList.contains('control-btn');
    
    // Don't start drag if clicking on buttons or controls
    if (isButton) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    this.isDragging = true;
    const callWindow = document.querySelector('.call-window') as HTMLElement;
    
    if (callWindow) {
      // Add dragging class and no-select class
      callWindow.classList.add('dragging');
      document.body.classList.add('no-select');
      
      const rect = callWindow.getBoundingClientRect();
      this.dragOffset.x = event.clientX - rect.left;
      this.dragOffset.y = event.clientY - rect.top;
      
      // Add event listeners for dragging
      document.addEventListener('mousemove', this.onDrag, { passive: false });
      document.addEventListener('mouseup', this.stopDrag);
    }
  }
  
  private onDrag = (event: MouseEvent) => {
    if (this.isDragging) {
      event.preventDefault();
      
      const callWindow = document.querySelector('.call-window') as HTMLElement;
      if (callWindow) {
        let x = event.clientX - this.dragOffset.x;
        let y = event.clientY - this.dragOffset.y;
        
        // Get window dimensions
        const windowRect = callWindow.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Constrain to viewport bounds with some padding
        const padding = 10;
        x = Math.max(padding, Math.min(x, viewportWidth - windowRect.width - padding));
        y = Math.max(padding, Math.min(y, viewportHeight - windowRect.height - padding));
        
        // Update position
        this.position.x = x;
        this.position.y = y;
        
        callWindow.style.right = 'auto';
        callWindow.style.bottom = 'auto';
        callWindow.style.left = `${x}px`;
        callWindow.style.top = `${y}px`;
      }
    }
  }
  
  private stopDrag = () => {
    this.isDragging = false;
    
    const callWindow = document.querySelector('.call-window') as HTMLElement;
    if (callWindow) {
      callWindow.classList.remove('dragging');
    }
    
    // Remove no-select class
    document.body.classList.remove('no-select');
    
    this.removeDragListeners();
  }
  
  private removeDragListeners() {
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  }
  
  private constrainToViewport() {
    const callWindow = document.querySelector('.call-window') as HTMLElement;
    if (callWindow && this.position.x !== 0 && this.position.y !== 0) {
      const rect = callWindow.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = this.position.x;
      let y = this.position.y;
      
      const padding = 10;
      
      // Check if window is outside viewport
      if (rect.right > viewportWidth - padding) {
        x = viewportWidth - rect.width - padding;
      }
      if (rect.bottom > viewportHeight - padding) {
        y = viewportHeight - rect.height - padding;
      }
      if (rect.left < padding) {
        x = padding;
      }
      if (rect.top < padding) {
        y = padding;
      }
      
      // Update position if needed
      if (x !== this.position.x || y !== this.position.y) {
        this.position.x = Math.max(0, x);
        this.position.y = Math.max(0, y);
        
        callWindow.style.left = `${this.position.x}px`;
        callWindow.style.top = `${this.position.y}px`;
        callWindow.style.right = 'auto';
        callWindow.style.bottom = 'auto';
      }
    }
  }
  
  private resetPosition() {
    const callWindow = document.querySelector('.call-window') as HTMLElement;
    if (callWindow) {
      // Reset to default bottom-right position
      callWindow.style.left = 'auto';
      callWindow.style.top = 'auto';
      callWindow.style.right = '20px';
      callWindow.style.bottom = '20px';
      this.position = { x: 0, y: 0 };
    }
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
    this.hasLocalAudio = false;
    this.showDeviceSelection = false;
  }
}