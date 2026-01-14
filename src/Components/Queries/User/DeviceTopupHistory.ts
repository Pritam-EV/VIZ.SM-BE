import { isObjectIdOrHexString } from "mongoose";
import DateConstants from "../../../Shared/Common/Constants/DateConstants.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert, AlertTypes } from "../../../Shared/Common/Models/Responses.js";
import { Device } from "../../../Shared/Data/MongoDB/Models/Device.js";
import { DeviceTransaction, DeviceTransactionSource } from "../../../Shared/Data/MongoDB/Models/Transaction.js";
import { User, UserStatus } from "../../../Shared/Data/MongoDB/Models/User.js";

export class Query {
    userId: string;
    deviceId: string;
    from: Date;
    till: Date;
    page: number;
    pageSize: number = 25;

    constructor(userId: string, deviceId: string, from?: Date, till?: Date, page: number = 1, pageSize: number = 25) {
        this.userId = userId;
        this.deviceId = deviceId;
        this.from = from || DateConstants.MinValue;
        this.till = till || DateConstants.MaxValue;
        this.page = page || 1;
        this.pageSize = pageSize || 25;
    }
}

interface ITransaction {
    txnId: string;
    energy: number;
    amount: number;
    date: Date;
    reversedAt?: Date;
}

interface IResult {
    id: string;
    txns: ITransaction[];
    hasMore?: true;
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
            if (query.deviceId) {
                const error = (new Device({ _id: query.deviceId })).validateSync("_id");
                if ((error && error.errors && error.errors["_id"]) || query.deviceId != query.deviceId.toUpperCase()) {
                    return [
                        false,
                        {
                            httpCode: ResponseStatus.BadRequest,
                            message: "Valid deviceId required",
                            alert: new Alert("Please select valid device", AlertTypes.Error)
                        }
                    ];
                }
            }
            else {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.BadRequest,
                        message: "DeviceId required",
                        alert: new Alert("Please select valid device", AlertTypes.Error)
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
                    status: UserStatus.Active,
                    "devices.device": query.deviceId
                }
            ).exec();

            if (!user?._id) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.NotFound,
                        message: "User device not found", // User must be active
                        alert: new Alert("Please select valid device", AlertTypes.Error)
                    }
                ];
            }

            const deviceTransactions = await DeviceTransaction.find(
                {
                    device: query.deviceId,
                    source: DeviceTransactionSource.UserBalance,
                    user: user._id,
                    energy: { $gt: 0 },
                    createdAt: {
                        $gte: query.from,
                        $lte: query.till
                    }
                },
                {
                    _id: 1,
                    energy: 1,
                    amount: 1,
                    reversedAt: 1,
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
                id: query.deviceId,
                txns: []
            }
            if (deviceTransactions && deviceTransactions.length > 0) {
                result.txns = deviceTransactions.map(
                    dTxn => {
                        return {
                            txnId: dTxn._id.toString(),
                            energy: dTxn.energy,
                            amount: dTxn.amount,
                            date: dTxn.createdAt,
                            reversedAt: dTxn.reversedAt
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
            this.#logger.error(error as Error, "Error occured while fetching user device transaction history", { input: query });

            return [
                false,
                {
                    httpCode: ResponseStatus.InternalServerError,
                    message: "Something failed while fetching user device transaction history"
                }
            ];
        }
    }
}