import { Schema, model, type InferSchemaType } from "mongoose";
import type { IUserDeviceHistory } from "../IModels/Archive.js";

export type { IUserDeviceHistory };

const UserDeviceHistorySchema = new Schema<IUserDeviceHistory>(
// const UserDeviceHistorySchema = new Schema(
    {
        device: {
            type: Schema.Types.String,
            required: true,
            ref: "Device",
            immutable: true
        },
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
            immutable: true
        },
        linkedAt: {
            type: Schema.Types.Date,
            required: true,
            immutable: true
        },
        unlinkedAt: {
            type: Schema.Types.Date,
            required: true,
            immutable: true
        },
        reason: {
            type: Schema.Types.String,
            immutable: true
        }
    }
);

export type TUserDeviceHistory = InferSchemaType<typeof UserDeviceHistorySchema>;

// export const UserDeviceHistory = model<IUserDeviceHistory>("UserDeviceHistory", UserDeviceHistorySchema);
export const UserDeviceHistory = model("UserDeviceHistory", UserDeviceHistorySchema);