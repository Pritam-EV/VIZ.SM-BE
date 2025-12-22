import type { IDeviceLink } from "./Device.js";
import type { IUserLink } from "./Member.js";


export interface IUserDeviceHistory extends IDeviceLink, IUserLink {
    linkedAt: Date;
    unlinkedAt: Date;
    reason?: string;
}