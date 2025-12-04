import type { AnyDataType } from "../Types/UnionTypes.js";

export function hasData(arg: unknown): arg is NonNullable<AnyDataType> {
    return typeof arg !== "undefined" && typeof arg !== "function" && arg != null;
}