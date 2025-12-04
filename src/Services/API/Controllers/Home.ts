import type { Request, Response } from "express";
import * as GetUserHomePageDetails from "../../../Components/Queries/User/HomePageDetails.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { ProfileFlags } from "../../../Shared/Common/Enums/Member.js";
import type { RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";

export default class HomeController {
    async getUserHomePageDetails(req: Request, res: Response) {
        if (((req as RequestWithUser).customContext.user.roles & ProfileFlags.User) === ProfileFlags.User) {
            if ((req as RequestWithUser).customContext.user.pIds?.length) {
                const result = await (new GetUserHomePageDetails.Handler((req as RequestWithUser).customContext.logger)).handle(
                    new GetUserHomePageDetails.Query((req as RequestWithUser).customContext.user.pIds![0])
                );

                res.status(ResponseStatus.Ok).json(result);
            }
            else {
                res.status(ResponseStatus.BadRequest).end();
            }
        }
        else {
            // Hiding the existence from unauthorized user
            res.status(ResponseStatus.NotFound).end();
        }
    }
}