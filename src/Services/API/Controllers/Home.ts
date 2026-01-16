import type { Request, Response } from "express";
import * as GetUserHomePageDetails from "../../../Components/Queries/User/HomePageDetails.js";
import verifyProfile from "../Filters/ProfileVerification.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { ProfileFlags } from "../../../Shared/Common/Enums/Member.js";
import { AlertsResponse } from "../../../Shared/Common/Models/Responses.js";
import type { RequestWithLoggerOnly, RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";

export default class HomeController {
async getUserHomePageDetails(req: Request, res: Response) {
  try {
    const userId = (req as RequestWithUser).customContext.user.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID missing from token" });
    }

    const [isSuccessful, resultData] = await (new GetUserHomePageDetails.Handler(
      (req as RequestWithUser).customContext.logger
    )).handle(new GetUserHomePageDetails.Query(userId));

    if (isSuccessful) {
      res.status(ResponseStatus.Ok).json(resultData);
    } else {
      (req as RequestWithLoggerOnly).customContext.logger.error("Failed to fetch home page details", { errorResult: resultData });
      res.status(resultData.httpCode || 500).json({ error: resultData.message || "Failed to load data" });
    }
  } catch (error) {
    console.error("HomeController crash:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

}