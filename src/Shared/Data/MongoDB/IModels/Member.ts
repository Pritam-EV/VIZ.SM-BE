// import { Schema } from 'mongoose';
import type { LoginStatus, PartnerStatus, UserStatus } from "../../../Common/Enums/Member.js";
import type { IDeviceLink } from './Device.js';
// import type { IModel, IModelTimeStamps } from "./ModelBase.js";

interface IPerson {
    firstName: string;
    midName?: string;
    lastName?: string;
    mobile: number;
    email: string;
}

export interface ILoginSecurity {
    /** Password hash with salt */
    pass: string;
    /** Password expiry time */
    passExpAt: Date;
}

export interface ILogin extends IPerson, ILoginSecurity /*, IModel, IModelTimeStamps */ {
    status: LoginStatus;
    aadhar?: number;
    pan?: string;
    /** For Google Sign-in users */
    googleId?: string;
}

/*
interface ILoginLink {
    login: Schema.Types.ObjectId | ILogin;
}
*/

export interface IUserDevice extends IDeviceLink {
    createdAt: Date;
}

export interface IUser /* extends ILoginLink, IModel, IModelTimeStamps */ {
    status: UserStatus;
    balance: number;
    devices?: IUserDevice[];
}

export interface IPartner /* extends ILoginLink, IModel, IModelTimeStamps */ {
    status: PartnerStatus;
}

/*
export interface IPartnerLink {
    partner: Schema.Types.ObjectId | IPartner;
}
*/