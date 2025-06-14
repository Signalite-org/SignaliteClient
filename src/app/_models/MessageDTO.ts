import { AttachmentDTO } from "./AttachmentDTO";
import { UserBasicInfo } from "./UserBasicInfo";

export interface MessageDTO {
    id: number,
    content?: string,
    lastModification: string,
    dateSent: string,
    attachment?: AttachmentDTO,
    sender: UserBasicInfo 
}