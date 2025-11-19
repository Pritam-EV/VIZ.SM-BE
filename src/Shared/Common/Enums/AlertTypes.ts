export enum SuccessAlertTypes {
    Success = "success",
    Warning = "warning"
}

export enum ErrorAlertTypes {
    Error = "error",
    Critical = "critical"
}

export enum AlertTypes {
    None = "",
    Success = "success",
    Warning = "warning",
    Error = "error",
    Critical = "critical"
}

export const toAlertType = (alertType: (SuccessAlertTypes | ErrorAlertTypes)): AlertTypes => (alertType || "") as unknown as AlertTypes;