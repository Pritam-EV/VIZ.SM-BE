import mongoose from "mongoose";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Alert, AlertTypes } from "../../../Shared/Common/Models/Responses.js";
import { Device, DeviceStatus } from "../../../Shared/Data/MongoDB/Models/Device.js";
import { DeviceTransaction, DeviceTransactionSource, WalletTransaction, WalletTransactionStatus, WalletTransactionType } from "../../../Shared/Data/MongoDB/Models/Transaction.js";
import { User, UserStatus } from "../../../Shared/Data/MongoDB/Models/User.js";

export class Command {
    userId: string;
    deviceId: string;
    amount: number;
    /** Unit: Amount per Kilo Watt Hour e.g. (₹/kWh) */
    rate: number;
    currency: string;

    /**
     * @param userId - Id of the user
     * @param deviceId - Id of the device
     * @param amount - Amount to use from user wallet for device topup.
     * @param rate - Device energy unit rate. Unit: Amount per Kilo Watt Hour e.g. (₹/kWh)
     * @param currency - Currency of the amount e.g. INR
     */
    constructor(userId: string, deviceId: string, amount: number, rate: number, currency: string = "INR") {
        this.userId = userId;
        this.deviceId = deviceId;
        this.amount = amount;
        this.rate = rate;
        this.currency = currency || "INR";
    }
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

type TResult = TErrorResult | undefined;

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
            if (!mongoose.isObjectIdOrHexString(command.userId)) {
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
            // Supports INR currency only
            // Rounded down to avoid issues. Like accuracy/resolution limits in transaction records.
            // ₹ 120.141 becomes ₹ 120.14, ₹ 120.149 becomes ₹ 120.14
            let amount = 0;
            if (!(command.amount > 0 && (amount = Math.floor(command.amount * 100) / 100) > 0)) {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    message: "Invalid amount",
                    alert: new Alert("Please provide some amount or energy units", AlertTypes.Error)
                };
            }
            if (command.rate <= 0) {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    message: "Invalid rate",
                    doExposeMessage: true
                };
            }
            if (command.currency !== "INR") {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    message: "Currency not supported",
                    doExposeMessage: true
                };
            }

            const device = await Device.findById(
                command.deviceId,
                {
                    _id: 1,
                    status: 1,
                    rate: 1,
                    energyLimit: 1
                },
                { lean: true }
            ).lean().exec();

            if (!device) {
                return {
                    httpCode: ResponseStatus.NotFound,
                    message: "Device not found",
                    alert: new Alert("Unknown device. Please select valid device.", AlertTypes.Error)
                };
            }
            if (!(device.status == DeviceStatus.Active || device.status == DeviceStatus.Inactive)) {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    alert: new Alert("Device is not operational. Please try later.", AlertTypes.Error)
                };
            }
            if (device.rate < 0.01) {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    message: `Invalid device unit rate. Device Rate: ${device.rate}`,
                    alert: new Alert("Device is not operational. Please try later.", AlertTypes.Error)
                };
            }
            if (!(command.rate >= device.rate)) {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    message: `Mismatched rates. Device Rate: ${device.rate} Requested Rate: ${command.rate}`,
                    alert: new Alert("Request outdated. Please refresh the page and try again.", AlertTypes.Error)
                };
            }

            // Energy is calculated based on rounded down amount to avoid allocating extra energy
            // Rounding down. Accuracy upto 0.001 kWh (1 Watt hour)
            const energy = Math.floor((amount / device.rate) * 1000) / 1000;

            const user = await User.findOne(
                {
                    _id: command.userId,
                    status: UserStatus.Active,
                    "devices.device": device._id
                },
                {
                    _id: 1,
                    status: 1,
                    balance: 1
                },
                {
                    lean: true
                }
            );

            if (!user) {
                return {
                    httpCode: ResponseStatus.NotFound,
                    message: "Invalid user device", // User must be active
                    alert: new Alert("Unknown device. Please select valid device.", AlertTypes.Error)
                };
            }
            if (amount > user.balance) {
                return {
                    httpCode: ResponseStatus.BadRequest,
                    alert: new Alert("Insufficient balance", AlertTypes.Error)
                };
            }
            this.#logger.info(
                "Updating user device energy limit",
                {
                    userId: command.userId,
                    deviceId: command.deviceId,
                    amount: amount,
                    energy: energy,
                    rate: command.rate,
                    deviceRate: command.rate != device.rate ? device.rate : undefined,
                    userBalance: user.balance,
                    energyLimit: device.energyLimit
                }
            );

            let isSuccessful = false;
            const mongooseSession = await mongoose.startSession();
            mongooseSession.startTransaction();
            try {
                const deviceTxns = await DeviceTransaction.create(
                    [
                        {
                            device: device._id,
                            energy: energy,
                            rate: command.rate,
                            amount: amount,
                            currency: command.currency,
                            source: DeviceTransactionSource.UserBalance,
                            user: user._id
                        }
                    ],
                    { session: mongooseSession }
                );

                await WalletTransaction.create(
                    [
                        {
                            amount: -1 * amount,
                            currency: command.currency,
                            status: WalletTransactionStatus.Successful,
                            type: WalletTransactionType.Transfer,
                            summary: `${device._id} topup`,
                            txnId: (deviceTxns[0]!)._id,
                            user: user._id
                        }
                    ],
                    { session: mongooseSession }
                );

                const userUpdateResult = await User.updateOne(
                    {
                        _id: user._id,
                        status: UserStatus.Active,
                        balance: { $gte: amount },
                        "devices.device": device._id
                    },
                    {
                        $inc: { balance: -1 * amount }
                    },
                    { session: mongooseSession }
                ).exec();

                let errorResult: TErrorResult | undefined = undefined;
                if (userUpdateResult.modifiedCount === 1) {
                    const deviceUpdateResult = await Device.updateOne(
                        {
                            _id: device._id,
                            $or: [
                                { status: DeviceStatus.Active },
                                { status: DeviceStatus.Inactive }
                            ]
                        },
                        {
                            $inc: { energyLimit: energy }
                        },
                        { session: mongooseSession }
                    ).exec();

                    if ((isSuccessful = deviceUpdateResult.modifiedCount === 1)) {
                        await mongooseSession.commitTransaction();
                    }
                    else {
                        this.#logger.warn("Failed to topup user device due to device update failure", { input: command, updateResult: deviceUpdateResult });
                        if (deviceUpdateResult.matchedCount === 1) {
                            errorResult = {
                                httpCode: ResponseStatus.InternalServerError,
                                message: "Failed to update device",
                                alert: new Alert("Something went wrong. Please try later.", AlertTypes.Error)
                            }
                        }
                        else {
                            errorResult = {
                                httpCode: ResponseStatus.Conflict,
                                alert: new Alert("Device is not operational. Please try later.", AlertTypes.Error)
                            }
                        }
                    }
                } else {
                    this.#logger.warn("Failed to topup user device due to user update failure", { input: command, updateResult: userUpdateResult });
                    if (userUpdateResult.matchedCount === 1) {
                        errorResult = {
                            httpCode: ResponseStatus.InternalServerError,
                            message: "Failed to update user",
                            alert: new Alert("Something went wrong. Please try later.", AlertTypes.Error)
                        }
                    }
                    else {
                        errorResult = {
                            httpCode: ResponseStatus.Conflict,
                            alert: new Alert("Invalid request. Please try again.", AlertTypes.Error)
                        }
                    }
                }

                if (errorResult) {
                    await mongooseSession.abortTransaction();

                    return errorResult;
                }
            }
            catch (error) {
                this.#logger.error(error as Error, "Error occured while saving chages of user device topup", { input: command });

                return {
                    httpCode: ResponseStatus.InternalServerError,
                    message: "Failed to update in db",
                    alert: new Alert("Something went wrong. Please try again.", AlertTypes.Error)
                }
            }
            finally {
                await mongooseSession.endSession();
            }

            if (isSuccessful) {
                // TODO: Send details to device via MQTT
            }
        }
        catch (error) {
            this.#logger.error(error as Error, "Error occured while user device topup", { input: command });

            return {
                httpCode: ResponseStatus.InternalServerError,
                message: "Something failed while user device topup"
            }
        }
    }
}