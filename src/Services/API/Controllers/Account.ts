import type { Request, Response } from "express";
import * as SignIn from "../../../Components/Commands/Account/SignIn.js";
import * as CreatePartner from "../../../Components/Commands/Partner/Create.js";
import * as CreateUser from "../../../Components/Commands/User/Create.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type { RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";
// Devices command
import {
  Command as GetUserDevicesCommand,
  Handler as GetUserDevicesHandler,
} from "../../../Components/Commands/Account/GetUserDevicesCommand.js";

// Profile command
import {
  Command as GetUserProfileCommand,
  Handler as GetUserProfileHandler,
} from "../../../Components/Commands/Account/GetUserProfileCommand.js";

export default class AccountController {
  async signIn(req: Request, res: Response) {
    const [isSuccessful, resultData] = await (new SignIn.Handler((req as RequestWithUser).customContext.logger)).handle(
      new SignIn.Command(
        req.body.username,
        req.body.password,
        req.body.remember
      )
    );

    if (isSuccessful) {
      res.status(ResponseStatus.Ok).json(resultData);
    }
    else {
      res.status(ResponseStatus.BadRequest).json(resultData);
    }
  }

  async userSignUp(req: Request, res: Response) {
    const [isSuccessful, invalidData] = await (new CreateUser.Handler((req as RequestWithUser).customContext.logger)).handle(
      new CreateUser.Command(
        req.body.firstName,
        req.body.mobile,
        req.body.email,
        req.body.password,
        req.body.aadhar,
        req.body.pan,
        req.body.middleName,
        req.body.lastName
      )
    );

    if (isSuccessful) {
      res.sendStatus(ResponseStatus.NoContent);
    }
    else {
      res.status(ResponseStatus.BadRequest).json({ invalid: invalidData });
    }
  }

  async partnerSignUp(req: Request, res: Response) {
    const [isSuccessful, invalidData] = await (new CreatePartner.Handler((req as RequestWithUser).customContext.logger)).handle(
      new CreatePartner.Command(
        req.body.firstName,
        req.body.mobile,
        req.body.email,
        req.body.password,
        req.body.aadhar,
        req.body.pan,
        req.body.middleName,
        req.body.lastName
      )
    );

    if (isSuccessful) {
      res.sendStatus(ResponseStatus.NoContent);
    }
    else {
      res.status(ResponseStatus.BadRequest).json({ invalid: invalidData });
    }
  }

  // Get user devices
  async getUserDevices(req: RequestWithUser, res: Response): Promise<void> {
    // Ensure auth middleware populated the user
    const userId = req.customContext?.user?.id;
    if (!userId) {
      res.status(ResponseStatus.Unauthorized).json({ message: "Unauthorized" });
      return;
    }

    const handler = new GetUserDevicesHandler(
      req.customContext.logger,
    );

    // Command expects a string userId
    const [isSuccessful, resultData] = await handler.handle(
      new GetUserDevicesCommand(userId),
    );

    if (isSuccessful) {
      res.status(ResponseStatus.Ok).json(resultData);
      return;
    } else {
      res.status(ResponseStatus.BadRequest).json(resultData);
      return;
    }
  }

  // Get user profile (for /api/account/profile)
  async getProfile(
    req: RequestWithUser,
    res: Response,
  ): Promise<void> {
    const userId = (req as RequestWithUser).customContext?.user?.id;
    if (!userId) {
      res.status(ResponseStatus.Unauthorized).json({ message: "Unauthorized" });
      return;
    }

    const handler = new GetUserProfileHandler(
      (req as any).customContext.logger,
    );

    const [isSuccessful, resultData] = await handler.handle(
      new GetUserProfileCommand(userId),
    );

    if (isSuccessful) {
      res.status(ResponseStatus.Ok).json(resultData);
      return;
    } else {
      res.status(ResponseStatus.BadRequest).json(resultData);
      return;
    }
  }
}