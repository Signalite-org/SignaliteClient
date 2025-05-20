import { UserDTO } from "./UserDTO";

export interface UserModifiedNotification extends UserDTO{
    oldUsername: string;
}