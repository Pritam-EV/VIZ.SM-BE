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
    isSuccessFul: boolean;
    isUsed: boolean;
    signature: string;
    orderedAt: Date;
}