import type { Request } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";
import type { JwtPayload } from "jsonwebtoken";
import type { ProfileFlags } from "../Enums/Member.js";
import type Logger from "../Models/Logging.js";

export type { Logger, ProfileFlags };

export interface ILoginTokenPayload extends JwtPayload {
    roles: ProfileFlags | 0;
    pIds?: [string, string?] | undefined;
}

interface IRequestUserDetails extends ILoginTokenPayload {
    id: string;
}

interface ICustomRequestLocals {
    logger: Logger;
    user: IRequestUserDetails;
}

type ConditionalRequestLocals<T extends Partial<Record<keyof ICustomRequestLocals, boolean>>> = { [K in keyof T as T[K] extends true ? K : never]: K extends keyof ICustomRequestLocals ? ICustomRequestLocals[K] : never };

export interface RequestWithLocals<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = Query, Locals extends Partial<Record<keyof ICustomRequestLocals, boolean>> = { [K in keyof ICustomRequestLocals]: false }> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
    customContext: ConditionalRequestLocals<Locals>;
}

export type ExtendedRequest<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = Query> = RequestWithLocals<P, ResBody, ReqBody, ReqQuery, { [K in keyof ICustomRequestLocals]: true }>;

export type RequestWithLoggerOnly<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = Query> = RequestWithLocals<P, ResBody, ReqBody, ReqQuery, { logger: true }>;

export type RequestWithUser<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = Query> = RequestWithLocals<P, ResBody, ReqBody, ReqQuery, { logger: true, user: true }>;

export interface RequestWithLoggerAndTracking<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = Query> extends RequestWithLocals<P, ResBody, ReqBody, ReqQuery, { logger: true }> {
    customContext: ConditionalRequestLocals<{ logger: true }> & { startTime: bigint; };
}