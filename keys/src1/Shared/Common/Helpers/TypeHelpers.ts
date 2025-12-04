import type { LoggableType, LoggableExtendedType, LoggablePrimitiveType } from "../Types/LoggableTypes.js";
import type { PrimitiveType, AnyDataType } from "../Types/UnionTypes.js";

export function isPrimitiveType(value: unknown): value is PrimitiveType {
    switch (typeof value) {
        case "bigint":
        case "boolean":
        case "number":
        case "string":
        case "symbol":
        case "undefined":
            return true;
        default:
            return false;
    }
}

/**
 * "function" data type is excluded.
 * @param value
 */
export function isAnyDataType(value: unknown): value is AnyDataType {
    if (isPrimitiveType(value) || (typeof value === "object")) {
        return true;
    }

    return false;
}

export function isLoggablePrimitive(value: unknown): value is LoggablePrimitiveType {
    switch (typeof value) {
        case "bigint":
        case "boolean":
        case "number":
        case "string":
        case "symbol":
            return true;
        default:
            return false;
    }
}

export function isLoggable(value: unknown): value is LoggableType {
    if (isLoggablePrimitive(value) || (typeof value === "object")) {
        return true;
    }

    return false;
}

export function isLoggableExtended(value: unknown): value is LoggableExtendedType {
    if (isLoggable(value) || (typeof value === "undefined")) {
        return true;
    }

    return false;
}

export function isIterable<T>(value: unknown): value is Iterable<T> {
    if (typeof value !== "object" || !value) {
        return false;
    }

    // Check if the value is an object and has the Symbol.iterator property.
    return Symbol.iterator in value;
}

// Static Type Checking (Compile-time)
export type TypeEquality<T, U> =
    Extract<keyof T, keyof U> extends never
        ? Extract<keyof U, keyof T> extends never
            ? true
            : false
        : false
;

/**
 * For iterables, checks if type of every elemet of T1 exists in types of elements of T2.  
 * Otherwise checks if types are identical  
 * Use to determine if T1 is assignable to T2
 * @todo Improve as required
 */
export function areIdenticalTypes<T1, T2 extends T1>(value1: T1, value2: T2): value1 is T2 {
    if (typeof value1 !== typeof value2) {
        return false;
    }

    if (typeof value1 === "object" && typeof value2 === "object") {
        if ((value1 && !value2) || (value2 && !value1)) {
            return false;
        }

        if (value1 && value2) {
            // for strict checking
            // if (Object.getPrototypeOf(value1) !== Object.getPrototypeOf(value2)) {
            //     return false;
            // }

            if (isIterable(value1) && isIterable(value2)) {
                // TODO: improve as required
                for (const value1Item of value1) {
                    let exists: boolean = false;
                    for (const value2Item of value2) {
                        if (areIdenticalTypes(value1Item, value2Item)) {
                            exists = true;
                            break;
                        }
                    }

                    if (!exists) {
                        return false;
                    }
                }
            }
            else {
                // for strict cheking 
                // use Object.getOwnPropertyNames() 
                // and move up the prototype chain with Object.getPrototypeOf()
                const value1Keys = Object.keys(value1);
                const value2Keys = Object.keys(value2);

                if (value1Keys.length !== value2Keys.length) {
                    return false;
                }

                for (const key of value1Keys) {
                    if (!(value2Keys.includes(key) && areIdenticalTypes(value1[key as keyof object], value2[key as keyof object]))) {
                        return false;
                    }
                }
            }
        }
    }

    // comparing function signatures is a challenge

    return true;
}