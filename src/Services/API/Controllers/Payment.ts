import type { Request, Response } from "express";
import * as CreateUserWalletCashfreeOrder from "../../../Components/Commands/Order/CreateCashfree.js";
import * as GetUserWalletCashfreeOrderStatus from "../../../Components/Queries/Order/OrderStatusCashfree.js";
import verifyProfile from "../Filters/ProfileVerification.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { ProfileFlags } from "../../../Shared/Common/Enums/Member.js";
import { BaseMessageResponse, AlertsResponse } from "../../../Shared/Common/Models/Responses.js";
import type { RequestWithLoggerOnly, RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";
import { PaymentGateway } from "../../../Shared/Common/Enums/Transaction.js";

export default class PaymentController {
    async createUserWalletTopupOrder(req: Request, res: Response) {
        verifyProfile(req as RequestWithUser, ProfileFlags.User);
        if ((req as RequestWithUser).customContext.user.pIds?.length) {
            if (req.body.gateWay != PaymentGateway[PaymentGateway.Cashfree]) {
                res.status(ResponseStatus.ServiceUnavailable).end();

                return;
            }

            const [isSuccessful, resultData] = await (new CreateUserWalletCashfreeOrder.Handler((req as RequestWithUser).customContext.logger)).handle(
                new CreateUserWalletCashfreeOrder.Command(
                    (req as RequestWithUser).customContext.user.pIds![0],
                    req.body.amount,
                    req.body.returnUrl
                )
            );

            if (isSuccessful) {
            res.status(ResponseStatus.Ok).json(resultData);
            } else {
            (req as RequestWithLoggerOnly).customContext.logger.error(
                "Failed to create user wallet order",
                { errorResult: resultData }
            );

            // TEMP: expose full error to FE for debugging
            res.status(resultData.httpCode || ResponseStatus.InternalServerError).json(resultData);
            }

        }
        else {
            res.status(ResponseStatus.BadRequest).end();
        }
    }

    async getUserWalletTopupOrderStatus(req: Request, res: Response) {
        verifyProfile(req as RequestWithUser, ProfileFlags.User);
        if ((req as RequestWithUser).customContext.user.pIds?.length) {
            if (req.body.gateWay != PaymentGateway[PaymentGateway.Cashfree]) {
                res.status(ResponseStatus.ServiceUnavailable).end();

                return;
            }

            const [isSuccessful, resultData] = await (new GetUserWalletCashfreeOrderStatus.Handler((req as RequestWithUser).customContext.logger)).handle(
                new GetUserWalletCashfreeOrderStatus.Query(
                    (req as RequestWithUser).customContext.user.pIds![0],
                    req.body.orderId
                )
            );

            if (isSuccessful) {
                res.status(ResponseStatus.Ok).json(resultData);
            }
            else {
                (req as RequestWithLoggerOnly).customContext.logger.error("Failed to get user wallet order status", { errorResult: resultData });
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