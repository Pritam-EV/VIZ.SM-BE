import { Schema, model, type InferSchemaType } from "mongoose";
import { PaymentGateway, PaymentMethod } from "../../../Common/Enums/Transaction.js";
import type { IPayment } from "../IModels/Transaction.js";

export type { IPayment };
export { PaymentGateway, PaymentMethod };

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
        gateway: {
            type: Schema.Types.Number,
            required: true,
            enum: {
                values: Object.values(PaymentGateway).filter(pg => typeof pg === "number"),
                message: "'{VALUE}' is not a valid payment gateway"
            },
            default: PaymentGateway.None,
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
        method: {
            type: Schema.Types.String,
            required: true,
            enum: {
                values: Object.values(PaymentMethod),
                message: "'{VALUE}' is not a valid wallet transaction source"
            },
            default: PaymentMethod.Unknown,
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
        isSuccessful: {
            type: Schema.Types.Boolean,
            default: false,
            immutable: true
        },
        isUsed: {
            type: Schema.Types.Boolean,
            required: true,
            default: false
            //set: value => this.isSuccessful === true && value === true
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

export type TPayment = InferSchemaType<typeof PaymentSchema>;

// export const Payment = model<IPayment>("Payment", PaymentSchema);
export const Payment = model("Payment", PaymentSchema);