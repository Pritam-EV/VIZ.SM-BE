import { isObjectIdOrHexString } from "mongoose";
import DateConstants from "../../../Shared/Common/Constants/DateConstants.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert, AlertTypes } from "../../../Shared/Common/Models/Responses.js";
import { WalletTransaction, type WalletTransactionStatus, type WalletTransactionType } from "../../../Shared/Data/MongoDB/Models/Transaction.js";
import { User, UserStatus } from "../../../Shared/Data/MongoDB/Models/User.js";

export class Query {
    userId: string;
    from: Date;
    till: Date;
    page: number;
    pageSize: number = 25;

    constructor(userId: string, from?: Date, till?: Date, page: number = 1, pageSize: number = 25) {
        this.userId = userId;
        this.from = from || DateConstants.MinValue;
        this.till = till || DateConstants.MaxValue;
        this.page = page || 1;
        this.pageSize = pageSize || 25;
    }
}

interface ITransaction {
    id: string;
    amount: number;
    status: WalletTransactionStatus;
    type: WalletTransactionType;
    date: Date;
    refundedAt?: Date;
    summary: string;
    txnId?: string;
}

interface IResult {
    txns: ITransaction[];
    hasMore?: true
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
            if (!(query.from instanceof Date && query.till instanceof Date && Number.isFinite(query.from.getTime()) && Number.isFinite(query.till.getTime()))) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadRequest,
                        message: "Invalid time period filter",
                        alert: new Alert("Please select appropriate period", AlertTypes.Error)
                    }
                ];
            }
            if (query.from > query.till) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadRequest,
                        message: `Invalid time period. From datetime (${query.from.toISOString()} is greater than till datetime (${query.till.toISOString()})`,
                        alert: new Alert("Please select appropriate period", AlertTypes.Error)
                    }
                ];
            }
            query.page = Math.floor(query.page);
            query.pageSize = Math.floor(query.pageSize);
            if (!(typeof query.page === "number" && typeof query.pageSize === "number" && query.page > 0 && query.pageSize > 0)) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadRequest,
                        message: "Invalid pagination parameters",
                        doExposeMessage: true
                    }
                ];
            }

            const user = await User.exists(
                {
                    _id: query.userId,
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

            const walletTransactions = await WalletTransaction.find(
                {
                    user: user._id,
                    amount: { $ne: 0 },
                    createdAt: {
                        $gte: query.from,
                        $lte: query.till
                    }
                },
                {
                    _id: 1,
                    amount: 1,
                    status: 1,
                    type: 1,
                    summary: 1,
                    txnId: 1,
                    refundedAt: 1,
                    createdAt: 1
                },
                {
                    sort: {
                        createdAt: -1
                    },
                    skip: (query.page - 1) * query.pageSize,
                    limit: query.pageSize,
                    lean: true
                }
            ).lean().exec();

            const result: IResult = {
                txns: []
            }
            if (walletTransactions && walletTransactions.length > 0) {
                result.txns = walletTransactions.map(
                    wTxn => {
                        return {
                            id: wTxn._id.toString(),
                            amount: wTxn.amount,
                            status: wTxn.status,
                            type: wTxn.type,
                            date: wTxn.createdAt,
                            refundedAt: wTxn.refundedAt,
                            summary: wTxn.summary,
                            txnId: wTxn.txnId
                        } as ITransaction;
                    }
                );

                if (result.txns.length === query.pageSize) {
                    result.hasMore = true;
                }
            }

            return [true, result];
        }
        catch (error) {
            this.#logger.error(error as Error, "Error occured while fetching user wallet transaction history", { input: query });

            return [
                false,
                {
                    httpCode: ResponseStatus.InternalServerError,
                    message: "Something failed while fetching user wallet transaction history"
                }
            ];
        }
    }
}