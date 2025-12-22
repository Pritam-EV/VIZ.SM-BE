import { isObjectIdOrHexString } from "mongoose";
import { AlertTypes } from "../../../Shared/Common/Enums/AlertTypes.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert } from "../../../Shared/Common/Models/Responses.js";
import { Device, DeviceStatus } from "../../../Shared/Data/MongoDB/Models/Device.js";
import { DeviceTransaction, DeviceTransactionSource } from "../../../Shared/Data/MongoDB/Models/Transaction.js";
import { User, UserStatus } from "../../../Shared/Data/MongoDB/Models/User.js";

export class Query {
    userId: string;
    deviceId: string;
    maxTxns: number = 25;

    constructor(userId: string, deviceId: string) {
        this.userId = userId;
        this.deviceId = deviceId;
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
    pool: number;
    isActive: boolean;
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

            const device = await Device.findById(
                query.deviceId,
                {
                    _id: 1,
                    pool: 1,
                    status: 1
                },
                { lean: true }
            ).lean().exec();

            if (!device?._id) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.NotFound,
                        message: "Device not found",
                        alert: new Alert("Please select valid device", AlertTypes.Error)
                    }
                ];
            }

            const deviceTransactions = await DeviceTransaction.find(
                {
                    device: query.deviceId,
                    source: DeviceTransactionSource.UserBalance,
                    user: user._id,
                    energy: { $gt: 0 }
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
                    limit: query.maxTxns,
                    lean: true
                }
            ).lean().exec();

            const result: IResult = {
                id: device._id,
                pool: device.pool,
                isActive: device.status === DeviceStatus.Active,
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

                if (result.txns.length === query.maxTxns) {
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