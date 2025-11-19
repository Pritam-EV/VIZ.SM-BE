export enum LoginStatus {
    Inactive = "inactive",
    Active = "active"
}

export enum UserStatus {
    Inactive = "inactive",
    Active = "active"
}

export enum PartnerStatus {
    Inactive = "inactive",
    Active = "active"
}

export enum ProfileFlags {
    User = 1 << 0,
    Partner = 1 << 1
}