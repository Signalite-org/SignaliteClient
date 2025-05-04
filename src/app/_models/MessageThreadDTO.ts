import { AttachmentDTO } from "./AttachmentDTO";
import { UserBasicInfo } from "./UserBasicInfo";
import {MessageDTO} from './MessageDTO';

export interface MessageThreadDTO {
    items: MessageDTO[],
    totalPages: number,
    itemsFrom: number,
    itemsTo: number,
    totalItemsCount: number
}
