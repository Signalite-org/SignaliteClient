import { UserBasicInfo } from "./UserBasicInfo";

export interface GroupMembersDTO {
    owner: UserBasicInfo;
    members: UserBasicInfo[];
}