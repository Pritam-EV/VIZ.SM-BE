export enum PaymentGateway {
    None = 0,
    Cashfree = 1,
    Razorpay = 2,
    Other = 5
}

export enum PaymentMethod {
    // ApplePay = "ap",
    BankTransfer = "bt",
    // CorporateCreditCard = "ccc",
    CardlessEmi = "clemi",
    Cash = "cash",
    CreditCard = "cc",
    CreditCardEmi = "ccemi",
    DebitCard = "dc",
    DebitCardEmi = "dcemi",
    NetBanking = "nb",
    Other = "other",
    PayLater = "pl",
    Paypal = "ppl",
    PrepaidCard = "ppc",
    UnifiedPaymentsInterface = "upi",
    Unknown = "",
    Wallet = "w"
}

export enum DeviceTransactionSource {
    Unknown = 0,
    UserBalance = 2,
    Other = 1
}

export enum WalletTransactionStatus {
    Unknown = 0,
    Successful = 1,
    Failed = 2,
    Pending = 3
}

export enum WalletTransactionType {
    /** Amount added through payment */
    Topup = "WALLET Topup",
    /** Amount used for device pool topup */
    Transfer = "POOL Transfer",
    /** Amount refunded to user */
    Refund = "Refund to bank",
    /** Amount charged for various reasons */
    Charges = "Charges",
    /** Amount reversed from device pool */
    Reversed = "Reversed from POOL",
    /** Amount returned to user in extreme case such as account closure */
    Return = "return",
    Other = "other",
    Unknown = "unknown",
}