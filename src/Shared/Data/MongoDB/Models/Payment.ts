import { Schema, model, type InferSchemaType } from "mongoose";
import type { IPayment } from "../IModels/Transaction.js";

export type { IPayment };

/**
 * @todo write validator and setter for isUsed
 */
// const PaymentSchema = new Schema<IPayment>(
const PaymentSchema = new Schema(
    {
        _id: {
            type: Schema.Types.String,
            required: true,
            // unique: true, // implicit
            immutable: true
        },
        /**
         * Unit: INR (₹)  
         * Accuracy: upto ₹0.01  
         * Minimum: ₹0  
        */
        amount: {
            type: Schema.Types.Number,
            required: true,
            min: [0, "Invalid amount"],
            immutable: true
        },
        /**
         * Supported: INR (₹)  
         * Currently, only INR (₹) is supported  
         */
        currency: {
            type: Schema.Types.String,
            required: true,
            immutable: true
        },
        initiatedAt: {
            type: Schema.Types.Date,
            required: true,
            immutable: true
        },
        status: {
            type: Schema.Types.String,
            required: true
        },
        isSuccessFul: {
            type: Schema.Types.Boolean,
            default: false,
            immutable: true
        },
        isUsed: {
            type: Schema.Types.Boolean,
            required: true,
            default: false
            //set: value => this.isSuccessFul === true && value === true
        },
        signature: {
            type: Schema.Types.String,
            required: true,
            unique: true,
            immutable: true
        },
        orderedAt: {
            type: Schema.Types.Date,
            required: true,
            immutable: true
        },
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
            immutable: true
        },
        order: {
            type: Schema.Types.String,
            required: true,
            ref: "Order",
            immutable: true
        }
    },
    {
        timestamps: true
    }
);

export type PaymentType = InferSchemaType<typeof PaymentSchema>;

// export const Payment = model<IPayment>("Payment", PaymentSchema);
export const Payment = model("Payment", PaymentSchema);