import { Schema, model, type InferSchemaType } from "mongoose";
import { LoginStatus } from "../../../Common/Enums/Member.js";
import { AadharCardNumberRegExp, EmailRegExp, IndianMobileRegExp, PanCardNumberRegExp } from "../../../Common/Constants/RegixExpressions.js";
import { addMonths } from "../../../Common/Helpers/DateHelpers.js";
// import type { ILogin } from "../IModels/Member.js";

export { LoginStatus };

// const LoginSchema = new Schema<ILogin>(
const LoginSchema = new Schema(
    {
        firstName: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            minLength: [3, "First name must have at least 3 characters"],
            maxLength: [50, "First name must not exceed 50 characters"]
        },
        midName: {
            type: Schema.Types.String,
            maxLength: [50, "Middle name must not exceed 50 characters"]
        },
        lastName: {
            type: Schema.Types.String,
            maxLength: [50, "Last name must not exceed 50 characters"]
        },
        /**
         * Indian mobile number of 10 digit without prefix  
         * Currently, only indian mobile numbers without prefix are supported  
         */
        mobile: {
            type: Schema.Types.Number,
            required: true,
            match: [IndianMobileRegExp, "Invalid mobile number. Require a valid indian mobile number."],
            min: [6000000000, "Mobile number is smaller than valid indian mobile number"],
            max: [9999999999, "Mobile number is greater than valid indian mobile number"],
            unique: true
        },
        email: {
            type: Schema.Types.String,
            required: true,
            trim: true,
            lowercase: true,
            match: [EmailRegExp, "Invalid email format"],
            minLength: [7, "Email must have at least 7 characters"],
            maxLength: [320, "Email with more than 320 characters is not supported"],
            unique: true
        },
        pass: {
            type: Schema.Types.String,
            required: true,
            minLength: [0, "Password is required."],
            maxLength: [100, "Invalid password."]
        },
        passExpAt: {
            type: Schema.Types.Date,
            required: true,
            default: () => { return addMonths(new Date(), 3) }
        },
        status: {
            type: Schema.Types.String,
            required: true,
            enum: Object.values(LoginStatus),
            default: LoginStatus.Active
        },
        aadhar: {
            type: Schema.Types.Number,
            match: [AadharCardNumberRegExp, "Invalid aadhar card number"],
            min: [200000000000, "Aadhar number is smaller than valid aadhar number"],
            max: [999999999999, "Aadhar number is greater than valid aadhar number"],
            unique: true,
            sparse: true
        },
        pan: {
            type: Schema.Types.String,
            trim: true,
            uppercase: true,
            match: [PanCardNumberRegExp, "Invalid pan card number format"],
            // minLength: [10, "Pan card number must have 10 characters"],
            maxLength: [10, "Pan card number must have 10 characters"],
            unique: true,
            sparse: true
        },
        // For Google Sign-in users
        googleId: {
            type: Schema.Types.String
        }
    },
    {
        timestamps: true
    }
);

export type LoginType = InferSchemaType<typeof LoginSchema>;

// export const Login = model<ILogin>("Login", LoginSchema);
export const Login = model("Login", LoginSchema);