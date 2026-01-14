import { ArgumentError } from "../../Shared/Common/CustomErrors/Errors.js";
import { PaymentMethod } from "../../Shared/Common/Enums/Transaction.js";

export default class CashfreeServiceHelper {
    static readonly #minAllowedPayment: number = 
        process.env.MIN_ALLOWED_PAYMENT 
            && Number.isFinite(Number(process.env.MIN_ALLOWED_PAYMENT)) 
            && Number(process.env.MIN_ALLOWED_PAYMENT) > 1 
        ? Number(process.env.MIN_ALLOWED_PAYMENT)
        : 1
    ;
    
    static readonly #apiVersion: string = "2025-01-01";
    public static get apiVersion(): string {
        return this.#apiVersion;
    }
    
    public static readonly supportedCurrency: string = "INR";
    public static readonly allowedPaymentString: string = `${CashfreeServiceHelper.#minAllowedPayment} ${CashfreeServiceHelper.supportedCurrency}`;

    public static get contactPhone(): string {
        return `${process.env.OUR_PHONE}`;
    } 

    private constructor() {}

    /**
     * Verifies amount
     * @param amountValue - Amount for order or payment
     * @returns True if valid, otherwise false.
     */
    public static isValidAmount(amountValue: number): boolean {
        return Number.isFinite(amountValue) && amountValue >= CashfreeServiceHelper.#minAllowedPayment;
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

    public static paymentGroupToMethod(paymentGroup: string) {
        switch (paymentGroup.toString().toLowerCase()) {
            case "bank_transfer":
                return PaymentMethod.BankTransfer;
            case "cardless_emi":
                return PaymentMethod.CardlessEmi;
            case "cash":
                return PaymentMethod.Cash;
            case "credit_card":
                return PaymentMethod.CreditCard;
            case "credit_card_emi":
                return PaymentMethod.CreditCardEmi;
            case "debit_card":
                return PaymentMethod.DebitCard;
            case "debit_card_emi":
                return PaymentMethod.DebitCardEmi;
            case "net_banking":
                return PaymentMethod.NetBanking;
            case "pay_later":
                return PaymentMethod.PayLater;
            case "paypal":
                return PaymentMethod.Paypal;
            case "prepaid_card":
                return PaymentMethod.PrepaidCard;
            case "upi_ppi_offline":
            case "upi":
            case "upi_credit_card":
            case "upi_ppi":
                return PaymentMethod.UnifiedPaymentsInterface;
            case "wallet":
                return PaymentMethod.Wallet;
            default:
                return PaymentMethod.Unknown;
        }
    }
}