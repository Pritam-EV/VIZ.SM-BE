import { HttpError } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import { DeviceStatus } from "../../../Shared/Common/Enums/Device.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
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
}

interface IResult {
    firstName: string;
    balance: number;
    devices?: IDeviceDetails[];
}

export class Handler {
    readonly #logger: Logger;

    constructor(logger: Logger) {
        this.#logger = logger;
    }

    public async handle(query: Query): Promise<IResult> {
        try {
            if (!query.userId) {
                throw new HttpError(ResponseStatus.BadRequest, "User required");
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
                                pool: 1
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
                throw new HttpError(ResponseStatus.NotFound, "User not found");
            }

            const result: IResult = {
                firstName: ((user.login as unknown) as ILogin).firstName,
                balance: user.balance
            }
            if (user.devices && user.devices.length > 0) {
                result.devices = user.devices.map(
                    dd => {
                        return {
                            id: (dd.device as IDevice)._id,
                            isActive: (dd.device as IDevice).status == DeviceStatus.Active,
                            pool: (dd.device as IDevice).pool
                        } as IDeviceDetails;
                    }
                );
            }

            return result;
        }
        catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }
            this.#logger.error(error as Error, "Error occured while fetching details for user home page.", { input: query });

            throw new HttpError(500, "Something failed while fetching details for user home page.");
        }
    }
}