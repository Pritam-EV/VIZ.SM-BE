export enum DeviceTransactionSource {
    Unknown = 0,
    Other = 1,
    UserBalance = 2
}

export enum WalletTransactionSource {
    Unknown = 0,
    Other = 1,
    Payment = 2,
    UserBalance = 3
}

export enum WalletTransactionDestination {
    Unknown = 0,
    Other = 1,
    UserBalance = 2,
    Device = 3
}