import { Schema, model, type InferSchemaType } from "mongoose";
import type { IOrder } from "../IModels/Transaction.js";

export type { IOrder };

/**
 * @todo refactor configuring minimum value for amount
 */
// const OrderSchema = new Schema<IOrder>(
const OrderSchema = new Schema(
    {
        _id: {
            type: Schema.Types.String,
            required: true,
            // unique: true, // implicit
            immutable: true
        },
        receiptId: {
            type: Schema.Types.String,
            required: true,
            unique: true,
            minLength: [30, "Receipt id must have at least 30 characters"],
            maxLength: [40, "Receipt id must not exceed 40 characters"],
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
        orderedAt: {
            type: Schema.Types.Date,
            required: true,
            immutable: true
        },
        status: {
            type: Schema.Types.String,
            required: true
        },
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
            immutable: true
        },
        payment: {
            type: Schema.Types.String,
            ref: "Payment"
        }
    },
    {
        timestamps: true
    }
);

export type OrderType = InferSchemaType<typeof OrderSchema>;

// export const Order = model<IOrder>("Order", OrderSchema);
export const Order = model("Order", OrderSchema);