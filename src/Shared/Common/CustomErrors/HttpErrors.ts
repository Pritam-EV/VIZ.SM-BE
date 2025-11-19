import http from "http";
import { ErrorAlertTypes } from "../Enums/AlertTypes.js"
import { ResponseStatus } from "../Enums/Http.js";

interface IHttpError {
    statusCode: number;
    doExpose: boolean;
}

export class HttpError extends Error implements IHttpError {
    static readonly name: string = "HttpError";
    statusCode: number;
    doExpose: boolean;

    public constructor(statusCode: ResponseStatus = ResponseStatus.InternalServerError, message: string | null = null, doExpose: boolean = false) {
        super(doExpose ? message || "Something failed" : message || http.STATUS_CODES[statusCode] || "Unknown");
        this.statusCode = statusCode;
        this.doExpose = doExpose;
    }
}

interface IAlertError extends IHttpError {
    alertType: ErrorAlertTypes;
}

export class AlertError extends HttpError implements IAlertError {
    static readonly name: string = "AlertError";
    alertType: ErrorAlertTypes;

    public constructor(statusCode: ResponseStatus, message: string, alertType: ErrorAlertTypes = ErrorAlertTypes.Error) {
        super(statusCode, message, true);
        this.alertType = alertType;
    }
}