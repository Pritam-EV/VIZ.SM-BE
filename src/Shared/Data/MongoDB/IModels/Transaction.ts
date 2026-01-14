import type { DeviceTransactionSource, PaymentGateway, PaymentMethod, WalletTransactionStatus, WalletTransactionType } from "../../../Common/Enums/Transaction.js";
import type { IDeviceLink } from "./Device.js";
import type { IModel } from "./ModelBase.js";

/*
interface IOrderLink {
    order: string;
}

interface IPaymentLink {
    payment: string;
}
*/

export interface IOrder extends IModel<string> {
    receiptId: string;
    gateway: PaymentGateway;
    amount: number;
    currency: string;
    orderedAt: Date;
    status: string;
    paymentAt: Date;
}

export interface IPayment extends IModel<string> {
    gateway: PaymentGateway;
    amount: number;
    currency: string;
    method: PaymentMethod;
    initiatedAt: Date;
    status: string;
    isSuccessful: boolean;
    isUsed: boolean;
    signature: string;
    orderedAt: Date;
}

export interface IDeviceTransaction extends IDeviceLink {
    /** Unit: Kilo Watt Hour (kWh) */
    energy: number;
    rate: number;
    amount: number;
    currency: string;
    source: DeviceTransactionSource;
    reversedAt?: Date;
}

export interface IWalletTransaction {
    amount: number;
    currency: string;
    status: WalletTransactionStatus;
    type: WalletTransactionType;
    summary: string;
    txnId?: string;
    refundedAt?: Date;
}