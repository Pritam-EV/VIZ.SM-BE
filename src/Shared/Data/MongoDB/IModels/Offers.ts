import type { OfferType } from "../../../Common/Enums/Offer.js";

interface IOfferBase {
    name: string;
    desc: string;
    type: OfferType;
}

export interface IOffer extends IOfferBase {
    minPurchaseAmount: number;
    maxOfferAmount: number;
    tAndC: string[];
}

// export interface IMixedOffer extends IOffer {
//     isMixedOffer?: boolean;
//     mixedOffers?: Set<({ type: OfferType; maxOfferAmount: number })>;
//     canClub?: boolean;
//     canClubWith?: Set<string>;
// }