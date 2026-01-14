import { Error as MongooseErrors, mongo, startSession } from "mongoose";
import { getPasswordHash } from "../../Helpers/LoginHelpers.js";
import { AlertError, ErrorAlertTypes, HttpError, ResponseStatus } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import type Logger from "../../../Shared/Common/Models/Logging.js";
import { Login, LoginStatus } from "../../../Shared/Data/MongoDB/Models/Login.js";
import { Partner, PartnerStatus } from "../../../Shared/Data/MongoDB/Models/Partner.js";

export class Command {
    firstName: string;
    middleName: string | undefined;
    lastName: string | undefined;
    mobile: number;
    email: string;
    password: string;
    aadhar: number;
    pan: string;

    constructor(firstName: string, mobile: number, email: string, password: string, aadhar: number, pan: string, middleName?: string, lastName?: string) {
        this.firstName = firstName;
        this.middleName = middleName;
        this.lastName = lastName;
        this.mobile = mobile;
        this.email = email;
        this.password = password;
        this.aadhar = aadhar;
        this.pan = pan;
    }
}

export class Handler {
    readonly #logger: Logger;

    constructor(logger: Logger) {
        this.#logger = logger;
    }

    public async handle(command: Command): Promise<[true, null] | [false, string[]]> {
        let mongooseSession: mongo.ClientSession | null = null;
        try {
            const [newLogin, invalidLoginFields] = await this.#buildLogin(command);

            if (invalidLoginFields && invalidLoginFields.length > 0) {
                let invalidFieldIndex = invalidLoginFields.indexOf("midName");
                if (invalidFieldIndex >= 0) {
                    invalidLoginFields[invalidFieldIndex] = "middleName";
                }
                invalidFieldIndex = invalidLoginFields.indexOf("pass");
                if (invalidFieldIndex >= 0) {
                    invalidLoginFields[invalidFieldIndex] = "password";
                }
            }

            const invalidFields: string[] = invalidLoginFields ?? [];
            if (!(typeof command.pan === "string" && command.pan)) {
                invalidFields.push("pan");
            }
            if (!(typeof command.aadhar === "number" && command.aadhar)) {
                invalidFields.push("aadhar");
            }
            if (invalidFields.length > 0) {
                return [false, invalidFields];
            }

            if (newLogin) {
                const existingLogin = await Login.findOne(
                    {
                        $or: [
                            { mobile: newLogin.mobile },
                            { email: newLogin.email },
                            { aadhar: newLogin.aadhar },
                            { pan: newLogin.pan }
                        ]
                    },
                    {
                        _id: 0,
                        mobile: 1,
                        email: 1,
                        aadhar: 1,
                        pan: 1
                    },
                    {
                        lean: true
                    }
                ).lean().exec();

                if (existingLogin) {
                    if (existingLogin.mobile == newLogin.mobile || existingLogin.email == newLogin.email) {
                        throw new AlertError(ResponseStatus.Conflict, "Email address or mobile number is already in use.", ErrorAlertTypes.Error);
                    }
                    if ((existingLogin.aadhar && existingLogin.aadhar == newLogin.aadhar) || (existingLogin.pan && existingLogin.pan == newLogin.pan)) {
                        throw new AlertError(ResponseStatus.BadRequest, "Aadhar card number or Pan card number is already in use.", ErrorAlertTypes.Error);
                    }
                }

                mongooseSession = await startSession();
                await mongooseSession.withTransaction(
                    async () => {
                        const savedLogin = await newLogin.save(
                            { session: mongooseSession }
                        );

                        await Partner.create(
                            [
                                {
                                    status: PartnerStatus.Active,
                                    login: savedLogin._id
                                }
                            ],
                            { session: mongooseSession }
                        );
                    }
                );

                return [true, null];
            }

            return [false, invalidFields];
        }
        catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }
            this.#logger.error(error as Error, "Error occured while creating a partner", { input: command });

            throw new HttpError(ResponseStatus.InternalServerError, "Something failed while creating a partner account");
        }
        finally {
            if (mongooseSession) {
                await mongooseSession.endSession();
            }
        }
    }

    async #buildLogin(command: Command): Promise<[InstanceType<typeof Login>, null] | [null, string[]]> {
        try {
            const newLogin = new Login(
                {
                    firstName: command.firstName,
                    mobile: command.mobile,
                    email: command.email,
                    pass: await getPasswordHash(command.password, false),
                    status: LoginStatus.Active,
                    aadhar: command.aadhar,
                    pan: command.pan,
                    // googleId: undefined
                }
            );
            if (command.middleName) {
                newLogin.midName = command.middleName;
            }
            if (command.lastName) {
                newLogin.lastName = command.lastName;
            }
            await newLogin.validate();

            return [newLogin, null];
        }
        catch (error) {
            console.error(error, "Failed to build login for a new partner.");
            if (error instanceof MongooseErrors.ValidationError) {
                return [null, Object.keys(error.errors)];
            }
            if (error instanceof MongooseErrors.CastError) {
                return [null, [error.path]];
            }
            
            throw error;
        }
    }
}