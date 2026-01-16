import { isObjectIdOrHexString } from "mongoose";
import { DeviceStatus } from "../../../Shared/Common/Enums/Device.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert, AlertTypes } from "../../../Shared/Common/Models/Responses.js";
import type { IDevice } from "../../../Shared/Data/MongoDB/IModels/Device.js";
import type { ILogin } from "../../../Shared/Data/MongoDB/IModels/Member.js";
import { User } from "../../../Shared/Data/MongoDB/Models/User.js";

export class Query {
    userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }
}

interface IDeviceDetails {
    id: string;
    isActive: boolean;
    pool: number;
    totalEnergy: number;
    rate: number;
}

interface IResult {
    firstName: string;
    balance: number;
    devices?: IDeviceDetails[];
}

interface IErrorResult {
    httpCode: ResponseStatus;
    message?: string;
    alert?: Alert;
}

export class Handler {
    readonly #logger: Logger;

    constructor(logger: Logger) {
        this.#logger = logger;
    }

    public async handle(query: Query): Promise<[true, IResult] | [false, IErrorResult]> {
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

            const user = await User.findById(
                query.userId,
                {
                    balance: 1,
                    devices: 1,
                    login: 1
                },
                {
                    populate: [
                        {
                            path: "devices.device",
                            select: {
                                _id: 1,
                                status: 1,
                                energyLimit: 1,
                                totalEnergy: 1,
                                rate: 1
                            },
                            options: { lean: true }
                        },
                        {
                            path: "login",
                            select: {
                                firstName: 1
                            },
                            options: { lean: true }
                        }
                    ],
                    lean: true
                }
            ).lean().exec();

            if (!user) {
                return [
                    false,
                    {
                        httpCode: ResponseStatus.NotFound,
                        message: "User not found",
                        alert: new Alert("Please sign up", AlertTypes.Critical)
                    }
                ];
            }

            const result: IResult = {
                firstName: ((user.login as unknown) as ILogin).firstName,
                balance: user.balance
            }
            if (user.devices && user.devices.length > 0) {
                result.devices = user.devices.map(
                    ud => {
                        return {
                            id: (ud.device as IDevice)._id,
                            isActive: (ud.device as IDevice).status == DeviceStatus.Active,
                            pool: (ud.device as IDevice).energyLimit - (ud.device as IDevice).totalEnergy,
                            totalEnergy: (ud.device as IDevice).totalEnergy,
                            rate: (ud.device as IDevice).rate
                        } as IDeviceDetails;
                    }
                );
            }

            return [true, result];
        }
        catch (error) {
            this.#logger.error(error as Error, "Error occured while fetching details for user home page", { input: query });

            return [
                false,
                {
                    httpCode: ResponseStatus.InternalServerError,
                    message: "Something failed while fetching details for user home page"
                }
            ];
        }
    }
}