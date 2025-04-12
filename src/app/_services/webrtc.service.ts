import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountService } from './account.service';
import { MediaDevice } from '../_models/WebRtc/MediaDevice';
import { CallInfo } from '../_models/WebRtc/CallInfo';
import { IceServer } from '../_models/WebRtc/IceServer';

import { PresenceService } from './presence.service';
import { CallState } from '../_models/WebRtc/CallState';
import { ConnectionQuality } from '../_models/WebRtc/ConnectionQuality';

@Injectable({
  providedIn: 'root'
})
export class WebRtcService {
  // api urls
  private baseUrl = environment.apiUrl;
  private hubUrl = environment.hubUrl;

  // Initialization state
  private _initialized = false;
  private initializing = false;

  private selectedAudioDevice: string | null = null;
  private selectedVideoDevice: string | null = null;
  
  // Media streams 
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  // Connection tracking
  private hubConnection!: HubConnection; // Using definite assignment assertion
  private peerConnection: RTCPeerConnection | null = null;
  private currentConnectionId: string = ''; // Initialize with empty string

  // Configuration
  private iceServers: IceServer[] | undefined = [];

  // Call state
  private currentCall: {
    peer: CallInfo | null;
    state: CallState
    } =
    {
      peer: null,
      state: CallState.Idle
    };
    // TODO: getter for current call

  private _audioDevices = signal<MediaDevice[]>([]);
  public get audioDevices() {
    return this._audioDevices.asReadonly();
  }

  private _videoDevices = signal<MediaDevice[]>([]);
  public get videoDevices() {
    return this._videoDevices.asReadonly();
  }

  private _callState = signal<CallState>(CallState.Idle);
  public get callState() {
    return this._callState.asReadonly();
  }

  private readonly incomingCallSubject = new Subject<CallInfo>();
  public get incomingCall$(): Observable<CallInfo> {
    return this.incomingCallSubject.asObservable();
  }


  private readonly callEstablishedSubject = new Subject<MediaStream>();
  public get callEstablished$(): Observable<MediaStream> {
    return this.callEstablishedSubject.asObservable();
  }

  private readonly callEndedSubject = new Subject<void>();
  public get callEnded$(): Observable<void> {
    return this.callEndedSubject.asObservable();
  }

  private readonly connectionStateChangeSubject = new Subject<RTCPeerConnectionState>();
  public get connectionStateChange$(): Observable<RTCPeerConnectionState> {
    return this.connectionStateChangeSubject.asObservable();
  }

  private readonly logsSubject = new BehaviorSubject<string[]>([]);
  public get logs$(): Observable<string[]> {
    return this.logsSubject.asObservable();
  }

  private _connectionQuality = signal<ConnectionQuality>(ConnectionQuality.Unknown);
  public get connectionQuality() {
    return this._connectionQuality.asReadonly();
  }

  private log(message: string) {
    console.log(`[WebRTC] ${message}`);
    const currentLogs = this.logsSubject.value;
    const timestamp = new Date().toISOString().substring(11, 19); // HH:MM:SS format
    this.logsSubject.next([...currentLogs, `${timestamp} - ${message}`]);

    // Keep only the last 100 logs
    if (this.logsSubject.value.length > 100) {
      this.logsSubject.next(this.logsSubject.value.slice(-100));
    }
  }

  constructor(private http: HttpClient, private accountService: AccountService, private presenceService: PresenceService) { }
  
  /**
   * Initialize the hub
   */
  public async initialize(): Promise<void> {
    try {
      if (!window.isSecureContext) {
        this.log('WARNING: Application is not running in a secure context. WebRTC may not work.');
      }
      // Get auth token from account service
      const token = this.accountService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      this.log('Fetching ICE server configuration...');
      // Get ICE server configuration from API
      this.iceServers = await this.http.get<IceServer[]>(`${this.baseUrl}/api/webrtc/ice-servers`).toPromise();
      if (this.iceServers)
        this.log(`Received ${this.iceServers.length} ICE servers`);

      else
        this.log(`ICE servers list is undefined`);

      // Initialize SignalR connection
      this.log('Initializing SignalR connection...');
      this.hubConnection = new HubConnectionBuilder()
        .withUrl(`${this.hubUrl}/signaling`, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build();

      // Set up SignalR event handlers
      this.setupSignalREvents();

      // Start the SignalR connection
      this.log('Starting SignalR connection...');
      await this.hubConnection.start();
      this.log('Connected to SignalR SignalingHub');

      // Register for signaling
      await this.registerForSignaling();
    } catch (error) {
      this.log(`Error initializing WebRTC service: ${error}`);
      throw error;
    }
  }

  /**
   * Register for signaling to get connection ID and online users
   */
  private async registerForSignaling(): Promise<void> {
    try {
      // Invoke the registration method
      this.log('Registering for signaling...');

      await this.hubConnection.invoke('RegisterForSignaling');
      this.log('RegisterForSignaling method invoked successfully');
    } catch (error) {
      this.log(`Error registering for signaling: ${error}`);
      throw error;
    }
  }


  /**
   * Set up SignalR event handlers
   */
  private setupSignalREvents(): void {
    // Handle signaling registration response
    this.hubConnection.on('SignalingRegistered', (data: {
      connectionId: string;
    }) => {
      this.log(`SignalingRegistered event received with connection ID: ${data.connectionId}`);
      this.currentConnectionId = data.connectionId;
    });

    // Handle incoming call offer (has username, userId, SDP offer, connectionID that is calling you)
    this.hubConnection.on('ReceiveOffer', (callData: CallInfo) => {
      console.log('Received offer from', callData.callerUsername, 'connection', callData.sourceConnectionId);

      // If already in a call, ignore this offer (TODO: think about handling this differently when in a call)
      if (this.currentCall.state !== 'idle') {
        console.warn('Ignoring offer because already in a call');
        return;
      }



      // Notify about incoming call
      this.incomingCallSubject.next(callData);
    });

    // Handle incoming answer
    this.hubConnection.on('ReceiveAnswer', (data: {
      calleeUsername: string;
      calleeId: number;
      answer: string;
      sourceConnectionId: string;
      targetConnectionId: string;
    }) => {
      console.log('Received answer from', data.calleeUsername, 'connection', data.sourceConnectionId);

      // Only process if this answer is meant for our connection
      if (this.currentConnectionId === data.targetConnectionId &&
        this.currentCall.state === 'offering') {
        console.log('Processing answer meant for this connection');

        if (!this.peerConnection) {
          console.error('Received answer but no peer connection exists');
          return;
        }

        try {
          // Set the remote description (answer)
          const answerSdp = JSON.parse(data.answer);
          this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp))
            .then(() => {
              console.log('Set remote description successfully');

              // Update the current call with callee info
              if (this.currentCall.peer) {
                this.currentCall.peer.sourceConnectionId = data.sourceConnectionId;
                this.updateCallState(CallState.Connected);
              }
            })
            .catch(error => {
              console.error('Error setting remote description', error);
            });
        } catch (error) {
          console.error('Error processing answer', error);
        }
      } else {
        console.log('Ignoring answer intended for a different connection or not in offering state');
      }
    });

    // Handle incoming ICE candidates
    this.hubConnection.on('ReceiveIceCandidate', (data: {
      senderUsername: string;
      senderId: number;
      candidate: string;
      sourceConnectionId: string;
      targetConnectionId: string;
    }) => {
      console.log('Received ICE candidate from', data.senderUsername, 'connection', data.sourceConnectionId);

      // Only process if this ICE candidate is meant for our connection
      if (this.currentConnectionId === data.targetConnectionId &&
        this.currentCall.state !== 'idle' &&
        this.currentCall.state !== 'hangingUp') {
        console.log('Processing ICE candidate meant for this connection');

        if (!this.peerConnection) {
          console.error('Received ICE candidate but no peer connection exists');
          return;
        }

        try {
          // Add the ICE candidate
          const candidate = JSON.parse(data.candidate);
          this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => {
              console.log('Added ICE candidate successfully');
            })
            .catch(error => {
              console.error('Error adding ICE candidate', error);
            });
        } catch (error) {
          console.error('Error processing ICE candidate', error);
        }
      } else {
        console.log('Ignoring ICE candidate - not for this connection or not in active call');
      }
    });

    // Handle call ended
    this.hubConnection.on('CallEnded', (data: {
      username: string;
      userId: number;
      sourceConnectionId: string;
      targetConnectionId: string;
    }) => {
      console.log('Call ended notification from', data.username, 'connection', data.sourceConnectionId);

      // Only process if this hangup is meant for our connection
      if (this.currentConnectionId === data.targetConnectionId &&
        this.currentCall.state !== 'idle' &&
        this.currentCall.state !== 'hangingUp') {
        console.log('Processing hangup meant for this connection');
        this.handleCallEnded();
      } else {
        console.log('Ignoring hangup - not for this connection or not in active call');
      }
    });
  }

  /**
   * Initialize a peer connection with the specified configuration
   */
  private initializePeerConnection(): void {
    if (this.peerConnection) {
      this.cleanupPeerConnection();
    }

    // Create a new peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers
    });

    // Set up event handlers
    this.peerConnection.onicecandidate = this.handleIceCandidate.bind(this);
    this.peerConnection.ontrack = this.handleTrack.bind(this);
    this.peerConnection.onconnectionstatechange = this.handleConnectionStateChange.bind(this);
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.peerConnection?.iceGatheringState);
    };
    this.peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state:', this.peerConnection?.signalingState);
    };

    // Add local stream tracks to the peer connection if they exist
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }
  }

  /**
   * Handle ICE candidate events
   */
  private handleIceCandidate(event: RTCPeerConnectionIceEvent): void {
    if (event.candidate && this.currentCall.peer) {
      this.log(`Generated ICE candidate: ${event.candidate.candidate}...`);

      // Assess connection quality
      this.assessConnectionQuality(event.candidate);

      this.hubConnection.invoke('SendIceCandidate',
        this.currentCall.peer.callerUsername,
        this.currentCall.peer.sourceConnectionId,
        JSON.stringify(event.candidate)
      ).catch(err => this.log(`Error sending ICE candidate: ${err}`));
    } else if (!event.candidate) {
      this.log('ICE candidate gathering complete');
    }
  }

  private assessConnectionQuality(candidate: RTCIceCandidate): void {
    if (!candidate.candidate) return;

    const candidateStr = candidate.candidate.toLowerCase();
    let quality: ConnectionQuality = ConnectionQuality.Unknown;

    // Check candidate type - host is best, reflexive is okay, relay is worst
    if (candidateStr.includes('typ host')) {
      quality = ConnectionQuality.Good;
    } else if (candidateStr.includes('typ srflx')) {
      quality = ConnectionQuality.Medium;
    } else if (candidateStr.includes('typ relay')) {
      quality = ConnectionQuality.Poor;
    }

    // Update connection quality
    this._connectionQuality.set(quality);
    this.log(`Connection quality assessed as: ${quality}`);
  }

  /**
   * Handle track events (remote stream)
   */
  private handleTrack(event: RTCTrackEvent): void {
    console.log('Received remote track', event.track.kind);

    this.remoteStream = event.streams[0];
    this.callEstablishedSubject.next(this.remoteStream);
    this.updateCallState(CallState.Connected);
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(): void {
    if (!this.peerConnection) return;

    console.log('Connection state changed to', this.peerConnection.connectionState);
    this.connectionStateChangeSubject.next(this.peerConnection.connectionState);

    // Handle disconnection
    if (this.peerConnection.connectionState === 'disconnected' ||
      this.peerConnection.connectionState === 'failed' ||
      this.peerConnection.connectionState === 'closed') {
      this.handleCallEnded();
    }
  }

  /**
   * Update the call state
   */
  private updateCallState(state: CallState): void {
    this.currentCall.state = state;
    this._callState.set(state)
  }

  /**
   * Start the local media stream (audio/video)
   */
  public async startLocalStream(audioOnly: boolean = false): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: this.selectedAudioDevice ? { deviceId: { exact: this.selectedAudioDevice } } : true,
        video: !audioOnly
          ? (this.selectedVideoDevice
            ? { width: 640, height: 480, deviceId: { exact: this.selectedVideoDevice } }
            : { width: 640, height: 480 })
          : false
      };

      this.log('Requesting media with constraints: ' + JSON.stringify(constraints));
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.log('Media access granted successfully');
      return this.localStream;
    } catch (error) {
      // Cast the error to an appropriate type to access its properties
      const mediaError = error as Error;
      const domError = error as DOMException;

      this.log(`Error getting media: ${domError.name || 'Unknown'} - ${mediaError.message || 'No message'}`);

      // Try with audio only if video failed and we weren't already audio-only
      if (!audioOnly && domError.name === 'NotFoundError') {
        this.log('Trying audio-only as fallback...');
        return this.startLocalStream(true);
      }

      throw error;
    }
  }

  public async checkAvailableDevices(): Promise<{ hasVideo: boolean, hasAudio: boolean }> {
    try {
      this.log('Checking available media devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
          kind: device.kind
        }));

      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
          kind: device.kind
        }));

      this._audioDevices.set(audioDevices);
      this._videoDevices.set(videoDevices);

      const hasVideo = this.videoDevices().length > 0;
      const hasAudio = this._audioDevices().length > 0;

      this.log(`Available devices: ${devices.length} total, Video inputs: ${hasVideo ? this.videoDevices().length : 'NO'}, Audio inputs: ${hasAudio ? this._audioDevices().length : 'NO'}`);

      return { hasVideo, hasAudio };
    } catch (error) {
      const typedError = error as Error;
      this.log(`Error enumerating devices: ${typedError.message || 'Unknown error'}`);
      return { hasVideo: false, hasAudio: false };
    }
  }

  // Method to set selected devices
  public setSelectedAudioDevice(deviceId: string): void {
    this.selectedAudioDevice = deviceId;
    this.log(`Selected audio device: ${deviceId}`);
  }

  public setSelectedVideoDevice(deviceId: string): void {
    this.selectedVideoDevice = deviceId;
    this.log(`Selected video device: ${deviceId}`);
  }
  /**
   * Start a call to a user
   */
  public async startCall(userId: number): Promise<void> {
    try {
      if (this.currentCall.state !== 'idle') {
        throw new Error('Cannot start a call while already in a call');
      }

      this.updateCallState(CallState.Offering);

      const targetUser = this.presenceService.isUserOnline(userId)
        ? { id: userId, username: 'Unknown' } // fallback
        : null;

      if (!targetUser) {
        throw new Error(`User with ID ${userId} not found in online users`);
      }

      // Create peer info
      this.currentCall.peer = {
        callerUsername: targetUser.username,
        callerId: targetUser.id,
        sourceConnectionId: '' // Will be set when we get an answer
      };

      // Initialize the peer connection
      this.initializePeerConnection();

      // Create an offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      // Set the local description
      await this.peerConnection!.setLocalDescription(offer);

      // Send the offer to the target user
      await this.hubConnection.invoke('SendOffer', userId, JSON.stringify(offer));

      console.log('Call started to', targetUser.username, 'ID:', userId);
    } catch (error) {
      console.error('Error starting call', error);
      this.updateCallState(CallState.Idle);
      this.currentCall.peer = null;
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  public async acceptCall(incomingCallInfo: CallInfo): Promise<void> {
    try {
      if (this.currentCall.state !== 'idle') {
        throw new Error('Cannot accept a call while already in a call');
      }

      // Get the offer from the call info
      const offer = incomingCallInfo.offer;
      if (!offer) {
        throw new Error('No offer found in incoming call info');
      }

      // Set current call info
      this.currentCall.peer = incomingCallInfo;
      this.updateCallState(CallState.Offering);

      // Initialize the peer connection
      this.initializePeerConnection();

      // Set the remote description (offer)
      const offerSdp = JSON.parse(offer);
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Create an answer
      const answer = await this.peerConnection!.createAnswer();

      // Set the local description
      await this.peerConnection!.setLocalDescription(answer);

      // Send the answer to the caller
      await this.hubConnection.invoke('SendAnswer',
        incomingCallInfo.callerUsername,
        incomingCallInfo.sourceConnectionId,
        JSON.stringify(answer)
      );

      console.log('Call accepted, answer sent to', incomingCallInfo.callerUsername);
    } catch (error) {
      console.error('Error accepting call', error);
      this.updateCallState(CallState.Idle);
      this.currentCall.peer = null;
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  public async rejectCall(incomingCallInfo: CallInfo): Promise<void> {
    if (this.currentCall.state !== 'idle') {
      console.warn('Cannot reject call while already in a call');
      return;
    }

    try {
      // Send hangup to the caller
      await this.hubConnection.invoke('HangUp',
        incomingCallInfo.callerUsername,
        incomingCallInfo.sourceConnectionId
      );
      console.log('Call rejected, notification sent to', incomingCallInfo.callerUsername);
    } catch (error) {
      console.error('Error rejecting call', error);
    }
  }

  /**
   * End the current call
   */
  public async hangUp(): Promise<void> {
    if (this.currentCall.state === 'idle' || !this.currentCall.peer) {
      console.warn('No active call to hang up');
      return;
    }

    try {
      this.updateCallState(CallState.HangingUp);

      // Notify the peer that we're hanging up
      await this.hubConnection.invoke('HangUp',
        this.currentCall.peer.callerUsername,
        this.currentCall.peer.sourceConnectionId
      );

      this.handleCallEnded();
    } catch (error) {
      console.error('Error hanging up call', error);
      // Clean up anyway
      this.handleCallEnded();
    }
  }

  /**
   * Common logic for handling call ended state
   */
  private handleCallEnded(): void {
    // Reset call state
    this.updateCallState(CallState.Idle);

    // Clean up peer connection
    this.cleanupPeerConnection();

    // Reset current call peer
    this.currentCall.peer = null;

    // Notify listeners
    this.callEndedSubject.next();
  }

  /**
   * Clean up peer connection resources
   */
  private cleanupPeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      if (this.peerConnection.onicegatheringstatechange)
        this.peerConnection.onicegatheringstatechange = null;
      if (this.peerConnection.onsignalingstatechange)
        this.peerConnection.onsignalingstatechange = null;

      // Close the connection
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop remote stream tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
  }

  /**
   * Clean up all resources when component is destroyed
   */
  public dispose(): void {
    // End any active call
    if (this.currentCall.state !== 'idle') {
      this.hangUp().catch(err => console.error('Error hanging up during dispose', err));
    }

    // Clean up peer connection
    this.cleanupPeerConnection();

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Stop the hub connection
    if (this.hubConnection) {
      this.hubConnection.stop().catch(err => console.error('Error stopping hub connection', err));
    }
  }

  /**
   * Toggle microphone mute state
   */
  public toggleMicrophone(muted: boolean): void {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Toggle camera enabled state
   */
  public toggleCamera(disabled: boolean): void {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !disabled;
      });
    }
  }

  public reconnect(token: string): void {
    this.log('Reconnecting SignalR hub with new token...');
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => {
          this.log('Disconnected. Reconnecting...');
          this.initialize();
        })
        .catch(error => {
          this.log(`Error stopping hub connection: ${error}`);
          // Try to reconnect anyway
          this.initialize();
        });
    } else {
      this.initialize();
    }
  }
}