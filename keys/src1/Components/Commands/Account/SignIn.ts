import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { FilterQuery } from "mongoose";
import { AlertError, HttpError } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import { ProfileFlags } from "../../../Shared/Common/Enums/Member.js";
import LocalEnvVars from "../../../Shared/Common/Models/LocalEnvVars.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import type { ILoginTokenPayload } from "../../../Shared/Common/Types/ApiTypes.js";
import { Login, LoginStatus, type LoginType } from "../../../Shared/Data/MongoDB/Models/Login.js";
import { Partner, PartnerStatus } from "../../../Shared/Data/MongoDB/Models/Partner.js";
import { User, UserStatus } from "../../../Shared/Data/MongoDB/Models/User.js";
import { isValidEmail, isValidMobileNumber, isValidPasswordString } from "../../Helpers/LoginHelpers.js";

export class Command {
    mobileOrEmail: string;
    password: string;
    remember: boolean;

    constructor(username: string, password: string, remember: boolean) {
        this.mobileOrEmail = username;
        this.password = password;
        this.remember = remember === true;
    }
}

/**
 * If password is expired then no roles are sent and token is sent with minimum details required for updating the login password.
 */
interface SuccessResult {
    token: string;
    isPasswordExpired?: true;
}

type TResult = [true, SuccessResult] | [false, string[]];

export class Handler {
    readonly #logger: Logger;

    constructor(logger: Logger) {
        this.#logger = logger;
    }

    public async handle(command: Command): Promise<TResult> {
        try {
            const invalidFields: string[] = [];
            const loginFindOneOrQueryFilter: FilterQuery<LoginType>[] = [];

            if (typeof command.mobileOrEmail !== "string") {
                invalidFields.push("username");
            }
            else {
                if (isValidMobileNumber(command.mobileOrEmail)) {
                    loginFindOneOrQueryFilter.push({ mobile: Number(command.mobileOrEmail) });
                }
                else if (isValidEmail(command.mobileOrEmail)) {
                    loginFindOneOrQueryFilter.push({ email: command.mobileOrEmail });
                }
                else {
                    invalidFields.push("username");
                }
            }
            if (!(isValidPasswordString(command.password))) {
                invalidFields.push("password");
            }

            if (invalidFields.length > 0) {
                return [false, invalidFields];
            }

            const login = await Login.findOne(
                {
                    status: LoginStatus.Active,
                    $or: loginFindOneOrQueryFilter
                },
                {
                    _id: 1,
                    pass: 1,
                    passExpAt: 1
                },
                {
                    lean: true
                }
            ).lean().exec();

            if (!login) {
                // throw new AlertError(ResponseStatus.NotFound, "Invalid credentials");
                throw new AlertError(ResponseStatus.Unauthorized, "Invalid credentials");
            }

            if (!(await bcrypt.compare(command.password, login.pass))) {
                // invalidFields.push("password");

                // return [false, invalidFields];
                throw new AlertError(ResponseStatus.Unauthorized, "Invalid credentials");
            }

            const result: SuccessResult = { token: "" }; 

            // TODO: Handle future expiry of the password with an alert. Currently forcing to update it 5 days prior expiry.
            if (login.passExpAt < new Date(Date.now() + (5 * 24 * 60 * 60 * 1000))) {
                result.isPasswordExpired = true;
            }

            const loginTokenPayload: ILoginTokenPayload = { sub: login._id.toString(), roles: 0 };

            if (!result.isPasswordExpired) {
                const user = await User.exists(
                    {
                        login: login._id,
                        status: UserStatus.Active
                    }
                ).exec();

                const partner = await Partner.exists(
                    {
                        login: login._id,
                        status: PartnerStatus.Active
                    }
                ).exec();

                if (user?._id && partner?._id) {
                    loginTokenPayload.roles |= (ProfileFlags.User | ProfileFlags.Partner);
                    loginTokenPayload.pIds = [user._id.toString(), partner._id.toString()];
                }
                else if (user?._id) {
                    loginTokenPayload.roles |= ProfileFlags.User;
                    loginTokenPayload.pIds = [user._id.toString()];
                }
                else if (partner?._id) {
                    loginTokenPayload.roles |= ProfileFlags.Partner;
                    loginTokenPayload.pIds = [partner._id.toString()];
                }
            }

            result.token = jwt.sign(
                loginTokenPayload,
                LocalEnvVars.jwtPrivateKey,
                {
                    algorithm: "RS256",
                    notBefore: "10ms",
                    expiresIn: result.isPasswordExpired ? "5m" : command.remember ? "1d" : "1h"
                }
            );

            return [true, result];
        }
        catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }
            this.#logger.error(error as Error, "Error occured while creating a user.", { input: command });

            throw new HttpError(500, "Something failed while creating a user account.");
        }
    }
}