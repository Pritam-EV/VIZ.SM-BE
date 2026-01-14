import { isObjectIdOrHexString } from "mongoose";
import CashfreeService from "../../../Services/Cashfree/Service.js";
import { CashfreeOrderStatus } from "../../../Shared/Common/Enums/Cashfree.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert, AlertTypes } from "../../../Shared/Common/Models/Responses.js";
import { Order, PaymentGateway } from "../../../Shared/Data/MongoDB/Models/Order.js";

export class Query {
    userId: string;
    internalOrderId: string;

    constructor(userId: string, internalOrderId: string) {
        this.userId = userId;
        this.internalOrderId = internalOrderId;
    }
}

type TStatus = "successful" | "failed" | "pending" | "cancelled";

interface IResult {
    status: TStatus;
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

    public async handle(query: Query): Promise<[true, IResult] | [false, TErrorResult]> {
        try {
            if (!query.userId) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.Unauthorized,
                        message: "UserId required",
                        alert: new Alert("Please sign up", AlertTypes.Critical)
                    }
                ];
            }
            if (!isObjectIdOrHexString(query.userId)) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.Unauthorized,
                        message: "Invalid userId",
                        alert: new Alert("Please sign up", AlertTypes.Critical)
                    }
                ];
            }
            if (!(typeof query.internalOrderId === "string" && query.internalOrderId)) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadRequest,
                        message: "OrderId is required",
                        alert: new Alert("Please sign up", AlertTypes.Error)
                    }
                ];
            }

            const order = await Order.findOne(
                {
                    receiptId: query.internalOrderId,
                    user: query.userId,
                    gateway: PaymentGateway.Cashfree
                }
            ).lean().exec();

            if (!order?._id) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.NotFound,
                        message: "Order not found",
                        alert: new Alert("Payment was not initiated", AlertTypes.Error)
                    }
                ];
            }
            if (order.status == CashfreeOrderStatus.PAID) {
                return [true, { status: order.payment ? "successful" : "pending" }];
            }

            const cashfreeOrder = await CashfreeService.cashfreeInstance.PGFetchOrder(query.internalOrderId);
            if (!(cashfreeOrder && cashfreeOrder.status == ResponseStatus.Ok && cashfreeOrder.data)) {
                this.#logger.error(
                    "Failed to fetch Cashfree order",
                    {
                        input: query,
                        cashfreeOrder: cashfreeOrder
                    }
                );

                const cashfreeOrderFetchError: TErrorResult = {
                    httpCode: ResponseStatus.InternalServerError,
                    message: "Failed to fetch Cashfree order",
                    alert: new Alert("Could not confirm payment. Please check later.", AlertTypes.Error)
                };
                switch (cashfreeOrder?.status) { 
                    case ResponseStatus.Unauthorized:
                        cashfreeOrderFetchError.message = "Cashfree authentication failed";
                        cashfreeOrderFetchError.alert = new Alert("Payment/Gateway service unavailable. Please check later.", AlertTypes.Error);
                        break;
                    case ResponseStatus.NotFound:
                        cashfreeOrderFetchError.httpCode = ResponseStatus.NotFound;
                        cashfreeOrderFetchError.message = "Cashfree order not found";
                        cashfreeOrderFetchError.alert = new Alert("Could not confirm payment", AlertTypes.Error);
                        break;
                    case ResponseStatus.TooManyRequests:
                        cashfreeOrderFetchError.httpCode = ResponseStatus.BadGateway;
                        cashfreeOrderFetchError.message = "Exceeded Cashfree API request limit";
                        cashfreeOrderFetchError.alert = new Alert("Gateway error. Please check after few minutes.", AlertTypes.Error);
                        break;
                    case ResponseStatus.InternalServerError:
                        cashfreeOrderFetchError.httpCode = ResponseStatus.BadGateway;
                        cashfreeOrderFetchError.message = "Cashfree failed to fetch an order";
                        cashfreeOrderFetchError.alert = new Alert("Gateway error. Please check later.", AlertTypes.Error);
                        break;
                }

                return [false, cashfreeOrderFetchError];
            }
            if (!(order._id == cashfreeOrder.data.cf_order_id && order.receiptId == cashfreeOrder.data.order_id 
                && order.amount == cashfreeOrder.data.order_amount && order.currency == cashfreeOrder.data.order_currency 
                && ((!cashfreeOrder.data.customer_details?.customer_id) || (order.user.toString() == cashfreeOrder.data.customer_details.customer_id))))
            {
                this.#logger.error(
                    "Order details mismatch",
                    {
                        input: query,
                        order: order,
                        cashfreeOrder: cashfreeOrder
                    }
                );

                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadGateway,
                        message: "Order details mismatched",
                        alert: new Alert("Invalid payment", AlertTypes.Critical)
                    }
                ];
            }
            if (!cashfreeOrder.data.order_status) {
                this.#logger.error(
                    "Missing status in Cashfree order",
                    {
                        input: query,
                        cashfreeOrder: cashfreeOrder
                    }
                );
            }

            return [true, { status: Handler.orderStatusToResultStatus(cashfreeOrder.data.order_status || order.status) }];
        }
        catch (error) {
            this.#logger.error(error as Error, "Error occured while fetching order status", { input: query });

            return [
                false,
                {
                    httpCode: ResponseStatus.InternalServerError,
                    message: "Something failed while fetching order status",
                    alert: new Alert("Something failed. Please check later.", AlertTypes.Error)
                }
            ];
        }
    }

    public static orderStatusToResultStatus(orderStatus: string): TStatus {
        switch (orderStatus) {
            case CashfreeOrderStatus.PAID:
                return "successful";
            case CashfreeOrderStatus.EXPIRED:
            case CashfreeOrderStatus.ACTIVE: // No payment (neither successful nor unsuccessful) for the order will be considered as failed
                return "failed";
            case CashfreeOrderStatus.TERMINATED:
                return "cancelled";
            default:
                return "pending"
        }
    }
}