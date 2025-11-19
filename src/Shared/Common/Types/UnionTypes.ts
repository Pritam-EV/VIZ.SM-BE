export type PrimitiveType = bigint | boolean | number | string | symbol | undefined;

// In JS, null is considered primitive value (not type) as it represents the intentional absence of any object value.

/**
 * Union of all data types except "function"
 */
export type AnyDataType = PrimitiveType | object | null;