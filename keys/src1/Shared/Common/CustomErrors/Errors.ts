export class ArgumentNullError extends Error {
    static readonly name: string = "ArgumentNullError";
    argumentName: string;

    public constructor(
        argName: string, 
        message: string = `Parameter '${argName}' cannot be undefined or null.`) 
        {
        super(message);
        this.argumentName = argName;
    }
}

export class ArgumentError extends Error {
    static readonly name: string = "ArgumentError";
    argumentName: string;
    
    public constructor(
        argName: string, 
        message: string = `Parameter '${argName}' is required.`) 
        {
        super(message);
        this.argumentName = argName;
    }
}