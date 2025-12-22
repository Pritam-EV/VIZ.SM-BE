import { Schema, model, type InferSchemaType } from "mongoose";
import { DeviceTransactionSource, WalletTransactionDestination, WalletTransactionSource } from "../../../Common/Enums/Transaction.js";
import type { IDeviceTransaction, IWalletTransaction } from "../IModels//Transaction.js";

export type { IDeviceTransaction, IWalletTransaction };
export { DeviceTransactionSource, WalletTransactionDestination, WalletTransactionSource };

// const DeviceTransactionSchema = new Schema<IDeviceTransaction>(
const DeviceTransactionSchema = new Schema(
    {
        device: {
            type: Schema.Types.String,
            required: true,
            ref: "Device",
            immutable: true
        },
        energy: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Energy must be positive"],
            default: 0,
            immutable: true
        },
        rate: {
            type: Schema.Types.Number,
            required: true,
            min: [10, "Invalid rate"],
            immutable: true
        },
        amount: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Amount must be positive"],
            default: 0,
            immutable: true
        },
        currency: {
            type: Schema.Types.String,
            required: true,
            immutable: true
        },
        source: {
            type: Schema.Types.Number,
            required: true,
            enum: Object.values(DeviceTransactionSource),
            default: DeviceTransactionSource.Unknown,
            immutable: true
        },
        reversedAt: {
            type: Schema.Types.Date
        },
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
            immutable: true
        }
    },
    {
        timestamps: true
    }
);

export type TDeviceTransaction = InferSchemaType<typeof DeviceTransactionSchema>;

// export const DeviceTransaction = model<IDeviceTransaction>("DeviceTransaction", DeviceTransactionSchema);
export const DeviceTransaction = model("DeviceTransaction", DeviceTransactionSchema);

// const WalletTransactionSchema = new Schema<IWalletTransaction>(
const WalletTransactionSchema = new Schema(
    {
        amount: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Amount must be positive"],
            default: 0,
            immutable: true
        },
        currency: {
            type: Schema.Types.String,
            required: true,
            immutable: true
        },
        source: {
            type: Schema.Types.Number,
            required: true,
            enum: Object.values(WalletTransactionSource),
            default: WalletTransactionSource.Unknown,
            immutable: true
        },
        creditedTo: {
            type: Schema.Types.Number,
            required: true,
            enum: Object.values(WalletTransactionDestination),
            default: WalletTransactionDestination.Unknown,
            immutable: true
        },
        summary: {
            type: Schema.Types.String,
            required: true,
            immutable: true
        },
        txnId: {
            type: Schema.Types.String,
            immutable: true
        },
        refundedAt: {
            type: Schema.Types.Date
        },
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
            immutable: true
        }
    },
    {
        timestamps: true
    }
);

export type TWalletTransaction = InferSchemaType<typeof WalletTransactionSchema>;

// export const WalletTransaction = model<IWalletTransaction>("WalletTransaction", DeviceTransactionSchema);
export const WalletTransaction = model("WalletTransaction", WalletTransactionSchema);