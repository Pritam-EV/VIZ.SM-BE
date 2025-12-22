import type { Request, Response } from "express";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import LocalEnvVars from "../../../Shared/Common/Models/LocalEnvVars.js";

export default class AuthController {
    async getJwtPublicKey(req: Request, res: Response) {
        if (LocalEnvVars.jwtPublicKey) {
            res.status(ResponseStatus.Ok)
                .json(
                    {
                        keys: [
                            {
                                kty: "RS256",
                                kid: LocalEnvVars.jwtPublicKey,
                                use: "sig"
                            }
                        ]
                    }
                )
            ;
        }
        else {
            res.status(ResponseStatus.NotFound);
        }
    }
}