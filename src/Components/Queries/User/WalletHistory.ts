import { isObjectIdOrHexString } from "mongoose";
import { AlertTypes } from "../../../Shared/Common/Enums/AlertTypes.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert } from "../../../Shared/Common/Models/Responses.js";
import { WalletTransaction, WalletTransactionDestination, WalletTransactionSource } from "../../../Shared/Data/MongoDB/Models/Transaction.js";
import { User, UserStatus } from "../../../Shared/Data/MongoDB/Models/User.js";

export class Query {
    userId: string;
    maxTxns: number = 10;

    constructor(userId: string) {
        this.userId = userId;
    }
}

interface ITransaction {
    id: string;
    amount: number;
    date: Date;
    refundedAt?: Date;
    summary: string;
    txnId?: string;
    isInvalid?: true;
}

interface IResult {
    balance: number;
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
            
            const user = await User.findOne(
                {
                    _id: query.userId,
                    status: UserStatus.Active
                },
                {
                    _id: 1,
                    balance: 1
                },
                {
                    lean: true
                }
            ).lean().exec();

            if (!user) {
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
                    amount: { $gt: 0 }
                },
                {
                    _id: 1,
                    amount: 1,
                    source: 1,
                    creditedTo: 1,
                    summary: 1,
                    txnId: 1,
                    refundedAt: 1,
                    createdAt: 1
                },
                {
                    sort: {
                        createdAt: -1
                    },
                    limit: query.maxTxns,
                    lean: true
                }
            ).lean().exec();

            const result: IResult = {
                balance: user.balance,
                txns: []
            }
            if (walletTransactions && walletTransactions.length > 0) {
                result.txns = walletTransactions.map(
                    wTxn => {
                        return {
                            id: wTxn._id.toString(),
                            amount: wTxn.creditedTo === WalletTransactionDestination.UserBalance ? wTxn.amount : (-1 * wTxn.amount),
                            date: wTxn.createdAt,
                            refundedAt: wTxn.refundedAt,
                            summary: wTxn.summary,
                            txnId: wTxn.txnId,
                            isInvalid: wTxn.source === WalletTransactionSource.UserBalance && wTxn.creditedTo === WalletTransactionDestination.UserBalance ? true : undefined
                        } as ITransaction;
                    }
                );

                if (result.txns.length === query.maxTxns) {
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