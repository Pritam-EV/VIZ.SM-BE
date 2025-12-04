import bcrypt from "bcryptjs";
import { EmailRegExp, IndianMobileRegExp, LoginPasswordRegExp } from "../../Shared/Common/Constants/RegixExpressions.js"
import { ArgumentError } from "../../Shared/Common/CustomErrors/Errors.js";

/**
 * Generates hash from password and return hash string  
 * @param password - Password to generate hash
 * @param throwErrorIfInvalid - throws error for invalid password if true, otherwise returns empty string for invalid password  
 * Note: Do not exceed 16 character password limit as bcryptjs hash ignores input beyond 72 bytes. It will lead to match all password prefix from 72 bytes till any.
 */
export async function getPasswordHash(password: string, throwErrorIfInvalid: boolean = true): Promise<string> {
    if (!isValidPasswordString(password)) {
        if (throwErrorIfInvalid) {
            throw new ArgumentError("password", "Invalid password provided.");
        }
        else {
            return "";
        }
    }

    return await bcrypt.hash(password, await bcrypt.genSalt(10));
}

 /** Note: Do not exceed 16 character password limit as bcryptjs hash ignores input beyond 72 bytes. It will lead to match all password prefix from 72 bytes till any. */
export function isValidPasswordString(password: string): boolean {
    return typeof password === "string" && password !== "" && LoginPasswordRegExp.test(password);
}

export function isValidEmail(email: string): boolean {
    return typeof email === "string" && email !== "" && EmailRegExp.test(email);
}


export function isValidMobileNumber(mobile: number): boolean;
export function isValidMobileNumber(mobile: string): boolean;
export function isValidMobileNumber(mobile: number | string): boolean {
    return (typeof mobile === "number" || (typeof mobile === "string" && mobile != "" && Number.isFinite(Number(mobile)))) && IndianMobileRegExp.test(mobile.toString());
}