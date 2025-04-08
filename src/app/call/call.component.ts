import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CallInfo } from '../_models/WebRtc/CallInfo';
import { OnlineUser } from '../_models/WebRtc/OnlineUser';
import { WebRtcService } from '../_services/webrtc.service';

@Component({
  standalone:true,
  selector: 'app-call',
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class CallComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo', { static: false }) localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo', { static: false }) remoteVideo!: ElementRef<HTMLVideoElement>;

  
  // Call state
  callState: 'idle' | 'offering' | 'answering' | 'connected' | 'hangingUp' = 'idle';
  isAudioOnly = false;
  isMicMuted = false;
  isCameraOff = false;
  
  // Call info
  currentCallInfo: CallInfo | null = null;
  incomingCallInfo: CallInfo | null = null;
  
  // User list (for calling)
  onlineUsers: OnlineUser[] = [];
  selectedUserId: number | null = null;
  
  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(private webRtcService: WebRtcService) {}

  async ngOnInit(): Promise<void> {
    try {
      // Initialize the WebRTC service
      await this.webRtcService.initialize();
      
      // Subscribe to WebRTC events
      this.subscribeToWebRtcEvents();
    } catch (error) {
      console.error('Error initializing call component', error);
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Dispose of WebRTC resources
    this.webRtcService.dispose();
  }

  /**
   * Subscribe to WebRTC service events
   */
  private subscribeToWebRtcEvents(): void {
    // Online users
    this.subscriptions.push(
      this.webRtcService.onlineUsers$.subscribe((users: OnlineUser[]) => {
        this.onlineUsers = users;
      })
    );
    
    // Call state changes
    this.subscriptions.push(
      this.webRtcService.callState$.subscribe((state: 'idle' | 'offering' | 'answering' | 'connected' | 'hangingUp') => {
        this.callState = state;
      })
    );
    
    // Incoming calls
    this.subscriptions.push(
      this.webRtcService.incomingCall$.subscribe((callInfo: CallInfo) => {
        this.incomingCallInfo = callInfo;
      })
    );
    
    // Call established - remote stream available
    this.subscriptions.push(
      this.webRtcService.callEstablished$.subscribe((remoteStream: MediaStream) => {
        if (this.remoteVideo && this.remoteVideo.nativeElement) {
          this.remoteVideo.nativeElement.srcObject = remoteStream;
        }
      })
    );
    
    // Call ended
    this.subscriptions.push(
      this.webRtcService.callEnded$.subscribe(() => {
        this.currentCallInfo = null;
        this.incomingCallInfo = null;
        if (this.remoteVideo && this.remoteVideo.nativeElement) {
          this.remoteVideo.nativeElement.srcObject = null;
        }
      })
    );
    
    // Connection state changes
    this.subscriptions.push(
      this.webRtcService.connectionStateChange$.subscribe((state: RTCPeerConnectionState) => {
        console.log('WebRTC connection state changed:', state);
      })
    );
  }

  /**
   * Initialize the local media stream
   */
  async initializeLocalStream(): Promise<void> {
    try {
      const stream = await this.webRtcService.startLocalStream(this.isAudioOnly);
      
      if (this.localVideo && this.localVideo.nativeElement) {
        this.localVideo.nativeElement.srcObject = stream;
      }
    } catch (error) {
      console.error('Error getting local stream', error);
    }
  }

  /**
   * Start a call to the selected user
   */
  async startCall(): Promise<void> {
    if (!this.selectedUserId) {
      console.error('No user selected');
      return;
    }
    
    try {
      // Initialize local stream if not already done
      if (this.localVideo?.nativeElement && !this.localVideo.nativeElement.srcObject) {
        await this.initializeLocalStream();
      }
      
      // Find user in online users
      const targetUser = this.onlineUsers.find(u => u.id === this.selectedUserId);
      if (targetUser) {
        this.currentCallInfo = {
          username: targetUser.username,
          userId: targetUser.id,
          connectionId: '' // Will be set when connection is established
        };
      }
      
      // Start the call
      await this.webRtcService.startCall(this.selectedUserId);
    } catch (error) {
      console.error('Error starting call', error);
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(): Promise<void> {
    if (!this.incomingCallInfo) {
      console.error('No incoming call to accept');
      return;
    }
    
    try {
      // Initialize local stream if not already done
      if (this.localVideo?.nativeElement && !this.localVideo.nativeElement.srcObject) {
        await this.initializeLocalStream();
      }
      
      // Update current call info
      this.currentCallInfo = this.incomingCallInfo;
      
      // Accept the call
      await this.webRtcService.acceptCall(this.incomingCallInfo);
      
      // Clear incoming call info as it's now the current call
      this.incomingCallInfo = null;
    } catch (error) {
      console.error('Error accepting call', error);
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(): Promise<void> {
    if (!this.incomingCallInfo) {
      console.error('No incoming call to reject');
      return;
    }
    
    try {
      await this.webRtcService.rejectCall(this.incomingCallInfo);
      this.incomingCallInfo = null;
    } catch (error) {
      console.error('Error rejecting call', error);
    }
  }

  /**
   * Hang up the current call
   */
  async hangUp(): Promise<void> {
    try {
      await this.webRtcService.hangUp();
    } catch (error) {
      console.error('Error hanging up call', error);
    }
  }

  /**
   * Toggle microphone mute state
   */
  toggleMicrophone(): void {
    this.isMicMuted = !this.isMicMuted;
    this.webRtcService.toggleMicrophone(this.isMicMuted);
  }

  /**
   * Toggle camera enabled state
   */
  toggleCamera(): void {
    this.isCameraOff = !this.isCameraOff;
    this.webRtcService.toggleCamera(this.isCameraOff);
  }

  /**
   * Toggle audio-only mode
   * Note: This would need to restart the call to take effect
   */
  toggleAudioOnly(): void {
    this.isAudioOnly = !this.isAudioOnly;
    // In a real implementation, you would need to restart the stream
  }
}