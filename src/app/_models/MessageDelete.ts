import { MessageDTO } from "./MessageDTO";

export interface MessageDelete {
  groupId: number;
  messageId: number;
  senderId: number;
  lastMessage?: MessageDTO
}
