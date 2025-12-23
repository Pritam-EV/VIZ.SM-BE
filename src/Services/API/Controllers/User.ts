import type { Request, Response } from "express";
import * as AddUserDevice from "../../../Components/Commands/User/AddDevice.js";
import * as RemoveUserDevices from "../../../Components/Commands/User/RemoveDevices.js";
import * as TopupUserDevice from "../../../Components/Commands/User/TopupDevice.js";
import * as UserDeviceTopupHistory from "../../../Components/Queries/User/DeviceTopupHistory.js";
import * as UserWalletHistory from "../../../Components/Queries/User/WalletHistory.js";
import verifyProfile from "../Filters/ProfileVerification.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { ProfileFlags } from "../../../Shared/Common/Enums/Member.js";
import { BaseMessageResponse, AlertsResponse } from "../../../Shared/Common/Models/Responses.js";
import type { RequestWithLoggerOnly, RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";

export default class UserController {
    async linkUserDevice(req: Request, res: Response) {
        verifyProfile(req as RequestWithUser, ProfileFlags.User);
        if ((req as RequestWithUser).customContext.user.pIds?.length) {
            const errorResult = await (new AddUserDevice.Handler((req as RequestWithUser).customContext.logger)).handle(
                new AddUserDevice.Command(
                    (req as RequestWithUser).customContext.user.pIds![0],
                    req.body.deviceId
                )
            );

            if (errorResult) {
                (req as RequestWithLoggerOnly).customContext.logger.error("Failed to link user device", { errorResult: errorResult });
                if (errorResult.alert) {
                    res.status(errorResult.httpCode).json(new AlertsResponse(errorResult.alert));
                }
                else {
                    res.status(errorResult.httpCode).end();
                }
            }
            else {
                res.status(ResponseStatus.NoContent).end();
            }
        }
        else {
            res.status(ResponseStatus.BadRequest).end();
        }
    }

    async unlinkUserDevices(req: Request, res: Response) {
        verifyProfile(req as RequestWithUser, ProfileFlags.User);
        if ((req as RequestWithUser).customContext.user.pIds?.length) {
            const errorResult = await (new RemoveUserDevices.Handler((req as RequestWithUser).customContext.logger)).handle(
                new RemoveUserDevices.Command(
                    (req as RequestWithUser).customContext.user.pIds![0],
                    req.body.deviceIds
                )
            );

            if (errorResult) {
                (req as RequestWithLoggerOnly).customContext.logger.error("Failed to unlink user device(s)", { errorResult: errorResult });
                if (errorResult.alert) {
                    res.status(errorResult.httpCode).json(new AlertsResponse(errorResult.alert));
                }
                else {
                    res.status(errorResult.httpCode).end();
                }
            }
            else {
                res.status(ResponseStatus.NoContent).end();
            }
        }
        else {
            res.status(ResponseStatus.BadRequest).end();
        }
    }

async topupUserDevice(req: Request, res: Response) {
    verifyProfile(req as RequestWithUser, ProfileFlags.User);
    
    // ✅ FIXED: Safe pId extraction + logging
    const user = (req as RequestWithUser).customContext.user;
    
    // DEBUG LOGGING (remove after fix works)
    console.log('🔍 TOPUP DEBUG:', {
        pIds: user?.pIds,
        pIdsLength: user?.pIds?.length,
        deviceId: req.body.deviceId,
        amount: req.body.amount,
        rate: req.body.rate
    });
    
    if (!user?.pIds?.length) {
        (req as RequestWithLoggerOnly).customContext.logger.error("No user profile found", { userId: user?.id });
        res.status(ResponseStatus.BadRequest).json(new AlertsResponse({
            type: "danger",  // ✅ FIXED: Correct AlertTypes enum!
            message: "User profile not found"
        } as any));  // ✅ Type assertion for safety
        return;
    }

    const profileId = user.pIds[0];

    const errorResult = await (new TopupUserDevice.Handler((req as RequestWithUser).customContext.logger)).handle(
        new TopupUserDevice.Command(
            profileId,
            req.body.deviceId,
            req.body.amount,
            req.body.rate,
            req.body.currency || "INR"
        )
    );

    if (errorResult) {
        (req as RequestWithLoggerOnly).customContext.logger.error("Failed to topup user device", { 
            errorResult: errorResult,
            profileId,
            deviceId: req.body.deviceId
        });
        if ("alert" in errorResult && errorResult.alert) {
            res.status(errorResult.httpCode).json(new AlertsResponse(errorResult.alert));
        }
        else if (errorResult.doExposeMessage) {
            res.status(errorResult.httpCode).json(new BaseMessageResponse(errorResult.message));
        }
        else {
            res.status(errorResult.httpCode).end();
        }
    }
    else {
        res.status(ResponseStatus.NoContent).end();
    }
}


    async userDeviceTopupHistory(req: Request, res: Response) {
        verifyProfile(req as RequestWithUser, ProfileFlags.User);
        if ((req as RequestWithUser).customContext.user.pIds?.length) {
            const [isSuccessful, resultData] = await (new UserDeviceTopupHistory.Handler((req as RequestWithUser).customContext.logger)).handle(
                new UserDeviceTopupHistory.Query(
                    (req as RequestWithUser).customContext.user.pIds![0],
                    req.query.deviceId as string
                )
            );

            if (isSuccessful) {
                res.status(ResponseStatus.Ok).json(resultData);
            }
            else {
                (req as RequestWithLoggerOnly).customContext.logger.error("Failed to fetch user device topup history", { errorResult: resultData });
                if ("alert" in resultData && resultData.alert) {
                    res.status(resultData.httpCode).json(new AlertsResponse(resultData.alert));
                }
                else if (resultData.doExposeMessage) {
                    res.status(resultData.httpCode).json(new BaseMessageResponse(resultData.message));
                }
                else {
                    res.status(resultData.httpCode).end();
                }
            }
        }
        else {
            res.status(ResponseStatus.BadRequest).end();
        }
    }

    async userWalletHistory(req: Request, res: Response) {
        verifyProfile(req as RequestWithUser, ProfileFlags.User);
        if ((req as RequestWithUser).customContext.user.pIds?.length) {
            const [isSuccessful, resultData] = await (new UserWalletHistory.Handler((req as RequestWithUser).customContext.logger)).handle(
                new UserWalletHistory.Query((req as RequestWithUser).customContext.user.pIds![0])
            );

            if (isSuccessful) {
                res.status(ResponseStatus.Ok).json(resultData);
            }
            else {
                (req as RequestWithLoggerOnly).customContext.logger.error("Failed to fetch user wallet history", { errorResult: resultData });
                if ("alert" in resultData && resultData.alert) {
                    res.status(resultData.httpCode).json(new AlertsResponse(resultData.alert));
                }
                else if (resultData.doExposeMessage) {
                    res.status(resultData.httpCode).json(new BaseMessageResponse(resultData.message));
                }
                else {
                    res.status(resultData.httpCode).end();
                }
            }
        }
        else {
            res.status(ResponseStatus.BadRequest).end();
        }
    }
}