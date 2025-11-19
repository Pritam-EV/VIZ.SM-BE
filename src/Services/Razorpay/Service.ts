import Razorpay from "razorpay";

/**
 * @todo Add webhook process Razorpay.validateWebhookSignature()
 */
export default class RazorpayService {
    static #razorpayInstance: Razorpay;

    private constructor() {}

    /**
     * get Rayzorpay SDK instance
    */
    public static get razorpayInstance(): Razorpay {
        if (!this.#razorpayInstance) {
            const keyId = process.env.RAZORPAY_KEY_ID;
            const keySecret = process.env.RAZORPAY_KEY_SECRET;

            if (!keyId || !keySecret) {
                // throw new Error('Razorpay API keys are not defined in environment variables.');
                throw new Error('Cannot initiate Razorpay');
            }

            this.#razorpayInstance = new Razorpay(
                {
                    key_id: keyId,
                    key_secret: keySecret,
                }
            );
        }

        return this.#razorpayInstance;
    }
}