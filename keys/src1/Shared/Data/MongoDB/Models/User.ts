import { Schema, model, type InferSchemaType } from "mongoose";
import { UserStatus } from "../../../Common/Enums/Member.js";
import type { IUser } from "../IModels/Member.js";

export type { IUser };
export { UserStatus };

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

export type UserType = InferSchemaType<typeof UserSchema>;

// export const User = model<IUser>("User", UserSchema);
export const User = model("User", UserSchema);