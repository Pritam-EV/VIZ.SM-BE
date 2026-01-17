import { isObjectIdOrHexString } from "mongoose";
import CashfreeServiceHelper from "../../../Services/Cashfree/Helper.js";
import CashfreeService from "../../../Services/Cashfree/Service.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { PaymentGateway } from "../../../Shared/Common/Enums/Transaction.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert, AlertTypes } from "../../../Shared/Common/Models/Responses.js";
import { Order } from "../../../Shared/Data/MongoDB/Models/Order.js";
import { User, UserStatus } from "../../../Shared/Data/MongoDB/Models/User.js";

/** Command to create new order using Cashfree */
export class Command {
    userId: string;
    amount: number;
    currency: string;
    returnUrl: string;

    constructor(userId: string, amount: number, returnUrl: string, currency: string = "INR") {
        this.userId = userId;
        this.amount = amount;
        this.returnUrl = returnUrl;
        this.currency = currency || "INR";
    }
}

/** Result of creating an order using Cashfree */
interface IResult {
    paymentSessionId: string;
}

interface IErrorResultBase {
    httpCode: ResponseStatus;
}

interface IErrorMessageResult extends IErrorResultBase {
    message: string;
    doExposeMessage?: true;
}

interface IErrorAlertResult extends IErrorResultBase {
    message?: string;
    doExposeMessage?: false;
    alert: Alert;
}

type TErrorResult = IErrorMessageResult | IErrorAlertResult;

export class Handler {
    readonly #logger: Logger;

    constructor(logger: Logger) {
        this.#logger = logger;
    }

    /**
     * Creates new order
     * @param {Command} command
     * @returns {Promise<Result>} Details of the order created if successful, otherwise error
     * @todo Add validations for vehicle of the user.
     */
    async handle(command: Command): Promise<[true, IResult] | [false, TErrorResult]> {
        try {
            if (!command.userId) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.Unauthorized,
                        message: "UserId required",
                        alert: new Alert("Please sign up", AlertTypes.Critical)
                    }
                ];
            }
            if (!isObjectIdOrHexString(command.userId)) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.Unauthorized,
                        message: "Invalid userId",
                        alert: new Alert("Please sign up", AlertTypes.Critical)
                    }
                ];
            }
            // Supports INR currency only
            // Rounded down to avoid issues. Like accuracy/resolution limits in transaction records.
            // ₹ 120.141 becomes ₹ 120.14, ₹ 120.149 becomes ₹ 120.14
            let amount = 0;
            if (!(command.amount > 0 && (amount = Math.floor(command.amount * 100) / 100) > 0 && CashfreeServiceHelper.isValidAmount(amount))) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadRequest,
                        message: "Invalid amount",
                        alert: new Alert(`Select a minimum of ${CashfreeServiceHelper.allowedPaymentString}, or more`, AlertTypes.Error)
                    }
                ];
            }
            if (command.currency !== "INR") {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadRequest,
                        message: "Currency not supported",
                        doExposeMessage: true
                    }
                ];
            }

            const user = await User.exists(
                {
                    _id: command.userId,
                    status: UserStatus.Active
                }
            ).exec();

            if (!user?._id) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.Forbidden,
                        message: "User is not active", // User must exists
                        alert: new Alert("Please sign up", AlertTypes.Critical)
                    }
                ];
            }

            const receiptId = CashfreeServiceHelper.generateReceiptId(user._id.toString());
            const orderResponse = await CashfreeService.cashfreeInstance.PGCreateOrder(
                {
                    order_id: receiptId,
                    order_amount: amount,
                    order_currency: command.currency,
                    customer_details: {
                        customer_id: user._id.toString(),
                        customer_phone: CashfreeServiceHelper.contactPhone
                    },
                    order_meta: {
                        return_url: `${command.returnUrl}?orderId={order_id}&amount=${amount}`,
                        // TODO: Add notify_url
                        payment_methods: "cc,dc,ccc,ppc,nb,upi"
                    }
                },
                receiptId
            );

            if (!(orderResponse && orderResponse.status == ResponseStatus.Ok)) {
                this.#logger.error(
                    "Failed to create Cashfree order",
                    {
                        command: command,
                        receiptId: receiptId,
                        cashfreeOrderResponse: orderResponse
                    }
                );

                const cashfreeErrorResult: TErrorResult = {
                    httpCode: ResponseStatus.InternalServerError,
                    message: "Failed to create Cashfree order",
                    alert: new Alert("Something went wrong. Please try later.", AlertTypes.Error)
                };
                switch (orderResponse?.status) { 
                    case ResponseStatus.Unauthorized:
                        cashfreeErrorResult.message = "Cashfree authentication failed";
                        cashfreeErrorResult.alert = new Alert("Payment/Gateway service unavailable. Please try later.", AlertTypes.Error);
                        break;
                    case ResponseStatus.Conflict:
                        cashfreeErrorResult.message = "Order already exists at Cashfree";
                        cashfreeErrorResult.alert = new Alert("Gateway error. Please try again.", AlertTypes.Warning);
                        break;
                    case ResponseStatus.TooManyRequests:
                        cashfreeErrorResult.httpCode = ResponseStatus.BadGateway;
                        cashfreeErrorResult.message = "Exceeded Cashfree API request limit";
                        cashfreeErrorResult.alert = new Alert("Gateway error. Please try again after few minutes.", AlertTypes.Warning);
                        break;
                    case ResponseStatus.InternalServerError:
                        cashfreeErrorResult.httpCode = ResponseStatus.BadGateway;
                        cashfreeErrorResult.message = "Cashfree failed to create an order";
                        cashfreeErrorResult.alert = new Alert("Gateway error. Please try later.", AlertTypes.Error);
                        break;
                }

                return [false, cashfreeErrorResult];
            }
            this.#logger.debug(
                "Cashfree order created",
                {
                    command: command,
                    receiptId: receiptId,
                    cashfreeOrderResponse: orderResponse
                }
            );

            if (!(orderResponse.data && orderResponse.data.cf_order_id && orderResponse.data.cf_order_id.length > 0 
                && orderResponse.data.order_id == receiptId && orderResponse.data.order_amount == amount 
                && orderResponse.data.order_currency == CashfreeServiceHelper.supportedCurrency 
                && orderResponse.data.order_status == "ACTIVE" && orderResponse.data.payment_session_id 
                && orderResponse.data.created_at && Number.isFinite((new Date(orderResponse.data.created_at)).getTime())))
            {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadGateway,
                        message: "Received invalid details in created order from Cashfree",
                        alert: new Alert("Gateway error. Please try later.", AlertTypes.Error)
                    }
                ];
            }

            await Order.create(
                {
                    _id: orderResponse.data.cf_order_id,
                    receiptId: receiptId,
                    gateway: PaymentGateway.Cashfree,
                    amount: orderResponse.data.order_amount,
                    currency: orderResponse.data.order_currency,
                    orderedAt: new Date(orderResponse.data.created_at),
                    status: orderResponse.data.order_status,
                    user: user._id
                }
            );

            return [true, { paymentSessionId: orderResponse.data.payment_session_id }];
        }
        catch (error) {
            this.#logger.error(error as Error, "Error occured while creating new cashfree order", { input: command });
            
            return [
                false,
                {
                    httpCode: ResponseStatus.InternalServerError,
                    message: "Something failed while creating new cashfree order"
                }
            ];
        }
    }
}