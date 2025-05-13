export interface FriendRequestDTO {
    id: number;
    senderId: number;
    senderUsername: string;
    requestDate: string;
    profilePhotoUrl?: string
  }