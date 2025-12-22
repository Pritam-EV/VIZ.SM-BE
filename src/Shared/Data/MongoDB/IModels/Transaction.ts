import type { DeviceTransactionSource, WalletTransactionDestination, WalletTransactionSource } from "../../../Common/Enums/Transaction.js";
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
    amount: number;
    currency: string;
    orderedAt: Date;
    status: string;
}

export interface IPayment extends IModel<string> {
    amount: number;
    currency: string;
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
    source: WalletTransactionSource;
    creditedTo: WalletTransactionDestination;
    summary: string;
    txnId?: string;
    refundedAt?: Date;
}