export type GenericFunctionType<TArg, TReturn> = (...args: TArg[]) => TReturn;

export type TDynamicObject<TKey extends PropertyKey, TValue> = { [key in TKey]?: TValue };

export type TDynamicObjectKey<TKey extends PropertyKey, TValue> = keyof TDynamicObject<TKey, TValue>;

export type TDynamicObjectValue<TKey extends PropertyKey, TValue> = TDynamicObject<TKey, TValue>[TKey];

export type TDynamicObjectMemberParam<TKey extends PropertyKey, TValue> = {
    key: TDynamicObjectKey<TKey, TValue>;
    value: TDynamicObjectValue<TKey, TValue>;
};