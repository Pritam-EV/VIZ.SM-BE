export type LoggablePrimitiveType = bigint | boolean | number | string | symbol;

export type LoggableType = LoggablePrimitiveType | object;

export type LoggableExtendedType = LoggableType | null | undefined;