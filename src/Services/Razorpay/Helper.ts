import crypto from "crypto";
import { ArgumentError } from "../../Shared/Common/CustomErrors/Errors.js";

export default class RazorpayServiceHelper {
    static readonly #minAllowedPayment: number =
        process.env.MIN_ALLOWED_PAYMENT
            && Number.isFinite(Number(process.env.MIN_ALLOWED_PAYMENT))
            && Number(process.env.MIN_ALLOWED_PAYMENT) > 1
        ? Number(process.env.MIN_ALLOWED_PAYMENT)
        : 1
    ;

    public static readonly supportedCurrency: string = "INR";
    public static readonly allowedPaymentString: string = `${RazorpayServiceHelper.#minAllowedPayment} ${RazorpayServiceHelper.supportedCurrency}`;

    private constructor() {}

    /**
     * Verifies signature with digest
     * @param orderId - Id of the order.
     * @param paymentId - Id of the processed payment.
     * @param signature - signature provided by Razorpay after successful payment
     * @returns True if valid, otherwise false.
     */
    public static validateSignature(orderId: string, paymentId: string, signature: string): boolean {
        if (!(orderId && paymentId && signature)) {
            return false;
        }
        const digest = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(orderId + "|" + paymentId).digest('hex');

        return digest === signature;
    }

    /**
     * Verifies amount
     * @param amountValue - Amount for order or payment
     * @returns True if valid, otherwise false.
     */
    public static isValidAmount(amountValue: number): boolean {
        return Number.isFinite(amountValue) && amountValue >= RazorpayServiceHelper.#minAllowedPayment;
    }

    /**
     * Generates ReciptId using UserId
     * @param userId - If of the User
     * @returns ReceiptId
     */
    public static generateReceiptId(userId: string): string {
        if (!(userId && userId.trim().length > 0)) {
            throw new ArgumentError("userId", "UserId is required to generate ReceiptId");
        }

        return `${userId}_${Date.now()}`;
    }
}