import { isObjectIdOrHexString } from "mongoose";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert, AlertTypes } from "../../../Shared/Common/Models/Responses.js";
import { Device, DeviceStatus } from "../../../Shared/Data/MongoDB/Models/Device.js";
import { User, UserStatus, type IUserDevice } from "../../../Shared/Data/MongoDB/Models/User.js";

export class Command {
    userId: string;
    deviceId: string;

    constructor(userId: string, deviceId: string) {
        this.userId = userId;
        this.deviceId = deviceId;
    }
}

interface IErrorResult {
    httpCode: ResponseStatus;
    message?: string;
    alert?: Alert;
}

type TResult = IErrorResult | undefined;

export class Handler {
    readonly #logger: Logger;

    constructor(logger: Logger) {
        this.#logger = logger;
    }

    public async handle(command: Command): Promise<TResult> {
        try {
            if (!command.userId) {
                return {
                    httpCode: ResponseStatus.Unauthorized,
                    message: "UserId required",
                    alert: new Alert("Please sign up", AlertTypes.Critical)
                };
            }
            if(!isObjectIdOrHexString(command.userId)) {
                return {
                    httpCode: ResponseStatus.Unauthorized,
                    message: "Invalid userId",
                    alert: new Alert("Please sign up", AlertTypes.Critical)
                };
            }
            if (command.deviceId) {
                const error = (new Device({ _id: command.deviceId })).validateSync("_id");
                if ((error && error.errors && error.errors["_id"]) || command.deviceId != command.deviceId.toUpperCase()) {
                    return {
                        httpCode: ResponseStatus.BadRequest,
                        message: "Valid deviceId required",
                        alert: new Alert("Please provide valid device number", AlertTypes.Error)
                    };
                }
            }
            else {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    message: "DeviceId required",
                    alert: new Alert("Please provide valid device number", AlertTypes.Error)
                };
            }

            const device = await Device.findById(
                command.deviceId,
                {
                    _id: 1,
                    status: 1
                },
                { lean: true }
            ).lean().exec();

            if (!device?._id) {
                return {
                    httpCode: ResponseStatus.NotFound,
                    message: "Device not found",
                    alert: new Alert("Unknown device. Please provide valid device number.", AlertTypes.Error)
                };
            }
            if (!(device.status == DeviceStatus.Active || device.status == DeviceStatus.Inactive)) {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    alert: new Alert("Device is not operational. Please provide another device number or try later.", AlertTypes.Error)
                };
            }

            const newUserDevice: IUserDevice = {
                device: device._id,
                linkedAt: new Date()
            };
            const userUpdateResult = await User.updateOne(
                {
                    _id: command.userId,
                    status: UserStatus.Active,
                    "devices.device": { $ne: newUserDevice.device }
                },
                {
                    $push: {
                        devices: newUserDevice
                    }
                }
            ).exec();

            if (userUpdateResult.modifiedCount === 1) {
                this.#logger.info("User device linked", { input: command, updateResult: userUpdateResult });
            }
            else {
                this.#logger.warn("Failed to link user device.", { input: command, updateResult: userUpdateResult });
                if (userUpdateResult.matchedCount === 1) {
                    return {
                        httpCode: ResponseStatus.InternalServerError,
                        message: "Failed to update user",
                        alert: new Alert("Something went wrong. Please try later.", AlertTypes.Error)
                    };
                }
                // User must be active
                return {
                    httpCode: ResponseStatus.Conflict,
                    alert: new Alert("Device is already linked", AlertTypes.Warning)
                };
            }
        }
        catch (error) {
            this.#logger.error(error as Error, "Error occured while linking user device", { input: command });

            return {
                httpCode: ResponseStatus.InternalServerError,
                message: "Something failed while linking user device"
            };
        }
    }
}