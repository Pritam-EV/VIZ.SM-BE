import type { Request, Response } from "express";
import * as GetUserHomePageDetails from "../../../Components/Queries/User/HomePageDetails.js";
import verifyProfile from "../Filters/ProfileVerification.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { ProfileFlags } from "../../../Shared/Common/Enums/Member.js";
import { AlertsResponse } from "../../../Shared/Common/Models/Responses.js";
import type { RequestWithLoggerOnly, RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";

export default class HomeController {
  async getUserHomePageDetails(req: Request, res: Response) {
    verifyProfile(req as RequestWithUser, ProfileFlags.User);
    if ((req as RequestWithUser).customContext.user.pIds?.length) {
      const [isSuccessful, resultData] = await (new GetUserHomePageDetails.Handler((req as RequestWithUser).customContext.logger)).handle(
        new GetUserHomePageDetails.Query((req as RequestWithUser).customContext.user.pIds![0])
      );

      if (isSuccessful) {
        res.status(ResponseStatus.Ok).json(resultData);
      }
      else {
        (req as RequestWithLoggerOnly).customContext.logger.error("Failed to fetch details for user home page", { errorResult: resultData });
        if (resultData.alert) {
          res.status(resultData.httpCode).json(new AlertsResponse(resultData.alert));
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