import { Cashfree, CFEnvironment, PGWebhookEvent } from "cashfree-pg";
import { Environment } from "../../Shared/Common/Enums/Process.js";

/**
 * @todo Add webhook process Razorpay.validateWebhookSignature()
 */
export default class CashfreeService {
    static #cashfreeInstance: Cashfree;

    private constructor() {}

    /**
     * get Cashfree SDK instance
    */
    public static get cashfreeInstance(): Cashfree {
        if (!this.#cashfreeInstance) {
            const clientId = process.env.CASHFREE_APP_ID;
            const clientSecret = process.env.CASHFREE_SECRET_KEY;

            if (!clientId || !clientSecret) {
                // throw new Error('Cashfree API client credentials are not defined in environment variables.');
                throw new Error('Cannot initiate Cashfree');
            }

            this.#cashfreeInstance = new Cashfree(
                process.env.NODE_ENV == Environment.Production ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
                process.env.CASHFREE_APP_ID,
                process.env.CASHFREE_SECRET_KEY
            );

            this.#cashfreeInstance.XApiVersion = "2025-01-01";
        }

        return this.#cashfreeInstance;
    }

    /**
     * Validates webhook event data
     * @param timestamp - x-webhook-timestamp header
     * @param signature - x-webhook-signature header
     * @param reqBody - Raw request body
     * @throws {Error}
     */
    public static verifyWebhookSignature(timestamp: string, signature: string, reqBody: Buffer): [true, PGWebhookEvent] | [false, undefined] {
        if (!(timestamp && signature && reqBody)) {
            return [false, undefined];
        }

        return [true, this.cashfreeInstance.PGVerifyWebhookSignature(signature, reqBody.toString(), timestamp)];
    }
}