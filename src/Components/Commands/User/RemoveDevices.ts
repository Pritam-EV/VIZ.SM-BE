import { isObjectIdOrHexString, mongo, Schema, startSession } from "mongoose";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert, AlertTypes } from "../../../Shared/Common/Models/Responses.js";
import { UserDeviceHistory, type TUserDeviceHistory } from "../../../Shared/Data/MongoDB/Models/Archive.js";
import { Device } from "../../../Shared/Data/MongoDB/Models/Device.js";
import { User, UserStatus, type TUser } from "../../../Shared/Data/MongoDB/Models/User.js";

export class Command {
    userId: string;
    deviceIds: string[];

    constructor(userId: string, deviceIds: string[]) {
        this.userId = userId;
        this.deviceIds = deviceIds;
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
        let mongooseSession: mongo.ClientSession | null = null;
        try {
            if (!command.userId) {
                return {
                    httpCode: ResponseStatus.Unauthorized,
                    message: "UserId required",
                    alert: new Alert("Please sign up", AlertTypes.Critical)
                };
            }
            if (!isObjectIdOrHexString(command.userId)) {
                return {
                    httpCode: ResponseStatus.Unauthorized,
                    message: "Invalid userId",
                    alert: new Alert("Please sign up", AlertTypes.Critical)
                };
            }
            if (command.deviceIds && command.deviceIds.length > 0) {
                if ((new Set(command.deviceIds)).size != command.deviceIds.length) {
                    return {
                        httpCode: ResponseStatus.BadRequest,
                        message: "Distinct deviceId(s) required",
                        alert: new Alert("Please select valid device(s)", AlertTypes.Error)
                    };
                }
                for (const deviceId of command.deviceIds) {
                    const error = (new Device({ _id: deviceId })).validateSync("_id");
                    if ((error && error.errors && error.errors["_id"]) || deviceId != deviceId.toUpperCase()) {
                        return {
                            httpCode: ResponseStatus.BadRequest,
                            message: "Valid deviceId(s) required",
                            alert: new Alert("Please select valid device(s)", AlertTypes.Error)
                        };
                    }
                }
            }
            else {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    message: "DeviceId(s) required",
                    alert: new Alert("Please select device(s)", AlertTypes.Error)
                };
            }

            const users = await User.aggregate<(TUser & { _id: Schema.Types.ObjectId; })>(
                [
                    {
                        $match: {
                            _id: command.userId,
                            status: UserStatus.Active
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            devices: {
                                $filter: {
                                    input: "$devices",
                                    as: "device",
                                    cond: { $in: ["$$device", command.deviceIds] }
                                }
                            }
                        }
                    }
                ]
            ).exec();

            if (!(users && users[0])) {
                return {
                    httpCode: ResponseStatus.Forbidden,
                    message: "User is not active", // User must exists
                    alert: new Alert("Please sign up", AlertTypes.Critical)
                };
            }
            if (users[0].devices?.length !== command.deviceIds.length) {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    alert: new Alert(`${(command.deviceIds.length === 1 ? "Device is" : "One or more devices are")} not linked. Please select valid device(s).`, AlertTypes.Error)
                };
            }
            const user = users[0];

            mongooseSession = await startSession();
            const userUpdateResult = await mongooseSession.withTransaction(
                async () => {
                    const now = new Date();
                    await UserDeviceHistory.create(
                        user.devices.map(ud => {
                            return {
                                device: ud.device,
                                user: user._id,
                                linkedAt: ud.linkedAt,
                                unlinkedAt: now,
                                reason: "RemovedByUser"
                            } as TUserDeviceHistory
                        }),
                        { session: mongooseSession }
                    );

                    return await User.updateOne(
                        {
                            _id: user._id
                        },
                        {
                            $pull: {
                                devices: command.deviceIds.length === 1
                                    ? { _id: command.deviceIds[0] }
                                    : { _id: { $in: command.deviceIds } }
                            }
                        },
                        { session: mongooseSession! }
                    ).exec();
                }
            );

            if (userUpdateResult.modifiedCount === 1) {
                this.#logger.info("User device(s) unlinked", { input: command, updateResult: userUpdateResult });
            }
            else if (userUpdateResult.matchedCount === 1) {
                this.#logger.warn("Failed to unlink user device(s)", { input: command, updateResult: userUpdateResult });
            }
            else {
                this.#logger.warn("User not found for unlinking user device(s)", { input: command, updateResult: userUpdateResult });
                // User must exist
                return {
                    httpCode: ResponseStatus.NotFound,
                    message: "User not found",
                    alert: new Alert("Please sign up", AlertTypes.Critical)
                };
            }
        }
        catch (error) {
            this.#logger.error(error as Error, "Error occured while unlinking user device(s)", { input: command });

            return {
                httpCode: ResponseStatus.InternalServerError,
                message: "Something failed while unlinking user device(s)"
            };;
        }
        finally {
            if (mongooseSession) {
                await mongooseSession.endSession();
            }
        }
    }
}