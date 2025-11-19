//import { type Request, type Response } from "express";
import { hostname } from "os";
import { v4 as newUUIDv4 } from "uuid";
import { DynamicObjectStore } from "../Generics/DynamicObjects.js";
import type { TDynamicObject, TDynamicObjectMemberParam } from "../Generics/GenericTypes.js";
import { isLoggableExtended } from "../Helpers/TypeHelpers.js";
import { type LoggablePrimitiveType, type LoggableType, type LoggableExtendedType } from "../Types/LoggableTypes.js";

enum LogLevel {
    Debug = "DEBUG",
    Info = "INFO",
    Warn = "WARN",
    Error = "ERROR"
}

interface ILogContext {
    /**
     * Index signature allowing dynamic properties having string key and value of any type in LoggableExtendedType
    */
    [key: string]: LoggableExtendedType;
    hostname: string;
    pid: number | string;
    timestamp: string;
    level: LogLevel;
    message: LoggablePrimitiveType;
    messageObj?: LoggableType;
    stack?: string;
}

class LogContext implements ILogContext {
    [key: string]: LoggableExtendedType;
    readonly hostname: string = hostname();
    readonly pid: string | number = process.pid;
    readonly timestamp: string = (new Date()).toISOString();
    readonly level: LogLevel;
    readonly message: LoggablePrimitiveType;
    readonly messageObj?: LoggableType;
    readonly stack?: string;

    public constructor(messageArg: LoggableType, logLevel: LogLevel = LogLevel.Info, stack: string | undefined = undefined) {
        this.level = logLevel;
        if (typeof messageArg === "object") {
            if (messageArg) {
                if (Object.keys(messageArg).length !== 0) {
                    this.message = messageArg.toString().slice(0, 500);
                }
                else {
                    this.message = "EMPTY_MESSAGE_OBJECT";
                }
                this.messageObj = messageArg;
            }
            else {
                this.message = "NO_MESSAGE_OBJECT";
            }
        }
        else {
            this.message = messageArg || (messageArg === false || messageArg === 0 || messageArg === 0n ? messageArg : "NO_MESSAGE");
        }
        if (stack) {
            this.stack = stack;
        }
    }
}

interface IDiagnosticsContext {
    //request?: Request;
    //response?: Response;
    actionId?: string;
    latency_ms?: number;
    userId?: string;
}

export class DiagnosticsContext implements TDynamicObject<string, LoggableExtendedType>, IDiagnosticsContext {
    [key: string]: LoggableExtendedType;
    //request?: Request;
    //response?: Response;
    actionId?: string;
    latency_ms?: number;
    userId?: string;

    /**
     * @param actionId - Id for the action. Either UUID or true to generate new UUID
     * @param userId - Id of the user.
     */
    public constructor(actionId: string | boolean | undefined = undefined, userId: string | undefined = undefined) {
        if (actionId) {
            if (actionId === true) {
                actionId = newUUIDv4();
            }
            this.actionId = actionId;
        }
        if (userId) {
            this.userId = userId;
        }
    }
}

interface ILogContextExtended extends ILogContext {
    isError?: boolean;
    error?: Error;
    data?: LoggableExtendedType[];
    tracking?: DiagnosticsContext;
}

class LogContextExtended extends LogContext implements ILogContextExtended {
    readonly isError?: boolean;
    readonly error?: Error;
    readonly tracking?: DiagnosticsContext;
    readonly additionalData?: LoggableExtendedType[];

    public constructor(
        primaryArg: LoggableExtendedType, 
        secondaryArg: LoggableExtendedType = undefined, 
        logLevel: LogLevel = LogLevel.Info, 
        stack: string | undefined = undefined, 
        diagnosticsContext: DiagnosticsContext | undefined = undefined, 
        ...optionalParams: LoggableExtendedType[]) 
        {
        let isSecondaryArgConsumable: boolean = !(typeof secondaryArg === "undefined" || secondaryArg === null);
        if (logLevel === LogLevel.Error && ((primaryArg && primaryArg instanceof Error) 
            || (typeof primaryArg === "string" && isSecondaryArgConsumable && secondaryArg instanceof Error))) 
            {
            if (typeof primaryArg === "string") {
                super((`${primaryArg} ${(secondaryArg as Error).message}`).trim(), logLevel, stack || undefined);
                this.error = secondaryArg as Error;
                isSecondaryArgConsumable = false;
            }
            else {
                if (typeof secondaryArg === "string") {
                    if (isSecondaryArgConsumable) {
                        super((`${secondaryArg} ${primaryArg.message}`).trim(), logLevel, stack || undefined);
                        isSecondaryArgConsumable = false;
                    }
                    else {
                        super(primaryArg.message, logLevel, stack || undefined);
                    }
                }
                else if (secondaryArg && secondaryArg instanceof Error) {
                    super(`Multiple error occurred. ${primaryArg.message} ; ${secondaryArg.message}`, logLevel, stack || undefined);
                }
                else {
                    super(primaryArg.message, logLevel, stack || undefined);
                }
                this.error = primaryArg;
            }
            this.isError = true;
        }
        else {
            super(primaryArg || (typeof primaryArg === "object" ? {} : (primaryArg === false || primaryArg === 0 || primaryArg === 0n) ? primaryArg : ""), logLevel, stack);
        }

        if (diagnosticsContext) {
            this.tracking = diagnosticsContext;
        }

        if (optionalParams && optionalParams.length > 0 && isSecondaryArgConsumable) {
            optionalParams.unshift(secondaryArg);
            this.additionalData = optionalParams;
        }
        else if (isSecondaryArgConsumable) {
            this.additionalData = [secondaryArg];
        }
        else if (optionalParams && optionalParams.length > 0) {
            this.additionalData = optionalParams;
        }
    }
}

export class DiagnosticsContextMemberParam implements TDynamicObjectMemberParam<NonNullable<string>, LoggableExtendedType> {
    key: NonNullable<string>;
    value: LoggableExtendedType;

    public constructor(diagnosticContextMemberName: NonNullable<string>, diagnosticContextMemberValue: LoggableExtendedType) {
        this.key = diagnosticContextMemberName;
        this.value = diagnosticContextMemberValue;
    }
}

export default class Logger extends DynamicObjectStore<string, LoggableExtendedType> {
    protected override readonly __dynamic_Object: DiagnosticsContext;

    /**
     * @param diagnosticsContext - Diagnostics context to add in logger instance. This Data will be added in every log.
     */
    public constructor(diagnosticsContext: NonNullable<DiagnosticsContext> | undefined = undefined) {
        super();
        this.__dynamic_Object = diagnosticsContext || new DiagnosticsContext();
    }

    private get hasDiagnosticsContext(): boolean {
        return Object.values(this.__dynamic_Object || {}).findIndex(value => isLoggableExtended(value)) > -1;
    }

    /**
     * Adds diagnostics data, skips if already exists with the same name/key
     * @param arg - diagnostics data member/property (compulsory)
     * @param optionalArgs - zero or more diagnostics data members/properties (optional)
     */
    public addDiagnosticsData(param: NonNullable<DiagnosticsContextMemberParam>, ...optionalParams: NonNullable<DiagnosticsContextMemberParam>[]): void {
        if (optionalParams && optionalParams.length > 0) {
            this.addProperties(param, ...optionalParams);
        }
        else {
            this.addProperty(param);
        }
    }

    /**
     * Updates diagnostics data, skips if does not exists with the same name/key  
     * Caution: Be careful while updating request related data such as actionId, userId, etc
     * @param arg - diagnostics data member/property (compulsory)
     * @param optionalArgs - zero or more diagnostics data members/properties (optional)
     */
    public updateDiagnosticsData(param: NonNullable<DiagnosticsContextMemberParam>, ...optionalParams: NonNullable<DiagnosticsContextMemberParam>[]): void {
        if (optionalParams && optionalParams.length > 0) {
            this.updateProperties(param, ...optionalParams);
        }
        else {
            this.updateProperty(param);
        }
    }

    /**
     * Adds new diagnostics data, if does not exists with the same name/key  
     * Otherwise updates/overwrites existing diagnostics data  
     * Caution: Be careful while updating request related data such as actionId, userId, etc
     * @param arg - diagnostics data member/property (compulsory)
     * @param optionalArgs - zero or more diagnostics data members/properties (optional)
     */
    public addOrUpdateDiagnosticsData(param: NonNullable<DiagnosticsContextMemberParam>, ...optionalParams: NonNullable<DiagnosticsContextMemberParam>[]): void {
        if (optionalParams && optionalParams.length > 0) {
            this.setProperties(param, ...optionalParams);
        }
        else {
            this.setProperty(param);
        }
    }

    public debug(message: LoggableType, ...optionalParams: LoggableExtendedType[]): void {
        this.log(LogLevel.Debug, message, optionalParams, (new Error("")).stack);
        // console.debug(message, optionalParams);
    }

    public info(message: LoggableType, ...optionalParams: LoggableExtendedType[]): void {
        this.log(LogLevel.Info, message, optionalParams, (new Error("")).stack);
        // console.info(message, optionalParams);
    }

    public warn(message: LoggableType, ...optionalParams: LoggableExtendedType[]): void {
        this.log(LogLevel.Warn, message, optionalParams, (new Error("")).stack);
        // console.warn(message, optionalParams);
    }

    public error(message: LoggableType, ...optionalParams: LoggableExtendedType[]): void {
        this.log(LogLevel.Error, message, optionalParams, (new Error("")).stack);
        // console.error(message, optionalParams);
    }

    private log(logLevel: LogLevel, message: LoggableExtendedType, optionalParams: LoggableExtendedType[], stackTrace: string | undefined = undefined): void {
        const logContext: LogContextExtended = this.generateLogContext(logLevel, message, optionalParams, sliceCallSites(stackTrace, 1));
        try {
            this.logAsync(logContext); // fire and forget
        }
        catch (err) {
            console.log(logContext);
            console.error(err, (`Fire and Forget logging failed. ActionId: '${logContext.tracking?.actionId}', Message: ${(err as Error)?.message}`).trim());
        }
    }

    private async logAsync(logContext: LogContextExtended): Promise<void> {
        console.log(JSON.stringify(logContext, logContextReplacer(), 2));
    }

    private generateLogContext(logLevel: LogLevel, message: LoggableExtendedType, optionalParams: LoggableExtendedType[], stackTrace: string | undefined = undefined): LogContextExtended {
        if (optionalParams && optionalParams.length > 0) {
            if (optionalParams.length > 1) {
                return new LogContextExtended(message, optionalParams.shift(), logLevel, stackTrace, this.hasDiagnosticsContext ? this.__dynamic_Object : undefined, ...optionalParams);
            }
            else {
                return new LogContextExtended(message, optionalParams[0], logLevel, stackTrace, this.hasDiagnosticsContext ? this.__dynamic_Object : undefined);
            }
        }
        else {
            return new LogContextExtended(message, undefined, logLevel, stackTrace, this.hasDiagnosticsContext ? this.__dynamic_Object : undefined);
        }
    }
}

function sliceCallSites(stackTrace: string | undefined, noOfCallSitesToRemove: number = 1): (string | undefined) {
    if (stackTrace && stackTrace.length > 0) {
        return stackTrace.split("\n").slice(1).slice(noOfCallSitesToRemove).join("\n").trim() || undefined;
    }

    return stackTrace || undefined;
}

function logContextReplacer(): ((key: PropertyKey, value: LoggableExtendedType) => LoggableExtendedType) {
    const seen = new WeakSet();

    return function (key: PropertyKey, value: LoggableExtendedType): LoggableExtendedType {
        if (typeof value === "object" && value !== null && value) {
            if (seen.has(value)) {
                // Circular reference found, discard key
                return (`Circular reference of type '${value.constructor.name}'`);
            }
            seen.add(value);
            // Non iterable object like Array, Set, Map, ...
            if (typeof value[Symbol.iterator as keyof object] !== "function") {
                try {
                    return getPlainObject(value);
                }
                catch {
                    return { ...value };
                }
            }
        }
        else if (typeof value === "bigint") {
            return value?.toString();
        }
        else if (typeof value === "symbol") {
            return value?.toString();
        }

        return value;
    };
}

function getPlainObject(obj: object): object {
    if (!obj) {
        return obj;
    }

    const result: TDynamicObject<PropertyKey, LoggableExtendedType> = { ...obj };
    let current = obj;

    try {
        while (current) {
            // Get own property names of the current object in the prototype chain
            const propertyNames = Object.getOwnPropertyNames(current);

            for (const propertyName of propertyNames) {
                try {
                    // Avoid overwriting if an own property shadows an inherited one
                    if (!(propertyName in result)) {
                        result[propertyName] = obj[propertyName as keyof object];
                    }
                }
                catch {
                    continue;
                }
                // catch (err) {
                //     console.error(`Property: ${propertyName}`, err);
                // }
            }
            // Move up the prototype chain
            current = Object.getPrototypeOf(current);
        }
    }
    catch {
        return result;
    }

    return result;
}