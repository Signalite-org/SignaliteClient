import {MessageDTO} from './MessageDTO';

export interface MessageOfGroupDTO {
  groupId: number,
  message: MessageDTO,
  isLast?: boolean | undefined,
}
