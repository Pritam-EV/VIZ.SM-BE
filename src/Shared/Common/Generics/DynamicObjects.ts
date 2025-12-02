import type { TDynamicObject, TDynamicObjectKey, TDynamicObjectValue, TDynamicObjectMemberParam } from "../Generics/GenericTypes.js";

// /**
//  * Return type of methods for data of dynamic object
//  */
// type DynamicDataObjectMethodsReturnType = Exclude<AnyDataType, undefined> | void;

// /**
//  * Method types for data of dynamic object
//  */
// type DynamicObjectBaseMethodsType<TKey extends TDynamicObjectKey<TValue>, TValue, TReturn extends DynamicDataObjectMethodsReturnType> = 
//     (<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(arg: IDynamicObjectMemberParam<TMemberKey, TMemberValue>) => TReturn) 
//     | (<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(arg: IDynamicObjectMemberParam<TMemberKey, TMemberValue>, ...optionalArgs: IDynamicObjectMemberParam<TMemberKey, TMemberValue>[]) => TReturn)
// ;

interface IDynamicObjectMethods<TKey extends PropertyKey, TValue> {
    /**
     * Adds members/properties, skips if already exists with the same key
     * @param arg - member/property (compulsory)
     * @param optionalArgs - zero or more members/properties (optional)
     * 
     */
    addProperties<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>, 
        ...optionalArgs: TDynamicObjectMemberParam<TMemberKey, TMemberValue>[]
    ): void;
    
    /**
     * Updates existing members/properties, skips if does not exists with the same name
     * @param arg - member/property (compulsory)
     * @param optionalArgs - zero or more members/properties (optional)
     */
    updateProperties<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>, 
        ...optionalArgs: TDynamicObjectMemberParam<TMemberKey, TMemberValue>[]
    ): void;
    
    /**
     * Adds new members/properties if does not exists with the same name  
     * Otherwise updates/overwrites existing
     * @param arg - member/property (compulsory)
     * @param optionalArgs - zero or more members/properties (optional)
     */
    setProperties<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>, 
        ...optionalArgs: TDynamicObjectMemberParam<TMemberKey, TMemberValue>[]
    ): void;
}

abstract class DynamicObjectMethodsBase<TKey extends PropertyKey, TValue> implements IDynamicObjectMethods<TKey, TValue> {
    /**
     * Must be extended and abstract methods must be implemented
     */
    protected constructor() {}

    public addProperties<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>, 
        ...optionalArgs: TDynamicObjectMemberParam<TMemberKey, TMemberValue>[]): void 
        {
        this.addProperty(arg);
        if (optionalArgs && optionalArgs.length > 0) {
            optionalArgs.forEach(optionalArg => this.addProperty(optionalArg));
        }
    }

    public updateProperties<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>, 
        ...optionalArgs: TDynamicObjectMemberParam<TMemberKey, TMemberValue>[]): void 
        {
        this.updateProperty(arg);
        if (optionalArgs && optionalArgs.length > 0) {
            optionalArgs.forEach(optionalArg => this.updateProperty(optionalArg));
        }
    }

    public setProperties<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>, 
        ...optionalArgs: TDynamicObjectMemberParam<TMemberKey, TMemberValue>[]): void 
        {
        this.setProperty(arg);
        if (optionalArgs && optionalArgs.length > 0) {
            optionalArgs.forEach(optionalArg => this.setProperty(optionalArg));
        }
    }

    protected addProperty<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>): void
        {
        if (arg && !this.hasProperty(arg.key)) {
            this.setProperty(arg);
        }
    }

    protected updateProperty<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>): void
        {
        if (arg && this.hasProperty(arg.key)) {
            this.setProperty(arg);
        }
    }

    protected abstract setProperty<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>): void
    ;

    protected abstract hasProperty<TMemberKey extends TDynamicObjectKey<TKey, TValue>>(memberKey: TMemberKey): boolean;
}

function sanitizeKey<TKey extends PropertyKey>(key: TKey): TKey {    
    switch (typeof key) {
        case "string":
            return key || (key === "" ? key : "") as TKey;
        case "number": 
            return key || (key === 0 ? key : 0) as TKey;
        case "symbol":
            return key || Symbol("");
        default:
            throw new TypeError(`${typeof key} type is not supported for the key.`);
    }
}

export abstract class DynamicObjectStore<TKey extends PropertyKey, TValue> extends DynamicObjectMethodsBase<TKey, TValue> {
    /**
     * Dynamic Object Storage
     */
    protected readonly abstract __dynamic_Object: TDynamicObject<TKey, TValue>;

    // public constructor(dynamicObjectInitialValue: TDynamicObject<TKey, TValue> = {}) {
    //     super();
    //     this.__dynamic_Object = dynamicObjectInitialValue || {};
    // }

    protected constructor() {
        super();
    }

    protected override setProperty<TMemberKey extends TDynamicObjectKey<TKey, TValue>, TMemberValue extends TDynamicObjectValue<TMemberKey, TValue>>(
        arg: TDynamicObjectMemberParam<TMemberKey, TMemberValue>): void
        {
        if (arg) {
            this.__dynamic_Object[sanitizeKey(arg.key)] = arg.value;
        }
    }

    protected override hasProperty<TMemberKey extends TDynamicObjectKey<TKey, TValue>>(memberKey: TMemberKey): boolean {
        return sanitizeKey(memberKey) in this.__dynamic_Object;
    }
}