import { Schema, model, type InferSchemaType } from "mongoose";
import { UserStatus } from "../../../Common/Enums/Member.js";
import type { IUser, IUserDevice } from "../IModels/Member.js";

export type { IUser, IUserDevice };
export { UserStatus };

// const UserDeviceSchema = new Schema<IUserDevice>(
const UserDeviceSchema = new Schema(
    {
        device: {
            type: Schema.Types.String,
            required: true,
            ref: "Device",
            immutable: true
        },
        linkedAt: {
            type: Schema.Types.Date,
            required: true,
            default: Date.now,
            immutable: true
        }
    },
    {
        _id: false
    }
);

export type TUserDevice = InferSchemaType<typeof UserDeviceSchema>;

// const UserSchema = new Schema<IUser>(
const UserSchema = new Schema(
    {
        status: {
            type: Schema.Types.String,
            required: true,
            enum: Object.values(UserStatus),
            default: UserStatus.Active
        },
        /**
         * Unit: INR (₹)  
         * Accuracy: upto ₹0.01  
         * Minimum: ₹0  
         * Default: ₹0  
        */
        balance: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Negative balance is not allowed"],
            default: 0
        },
        devices: {
            type: [UserDeviceSchema]
        },
        login: {
            type: Schema.Types.ObjectId,
            required: true,
            unique: true,
            ref: "Login",
            immutable: true
        }
    },
    {
        timestamps: true,
        optimisticConcurrency: true
    }
);

export type TUser = InferSchemaType<typeof UserSchema>;

// export const User = model<IUser>("User", UserSchema);
export const User = model("User", UserSchema);
