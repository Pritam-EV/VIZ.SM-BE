/** 10 digits starting with 6 or higher */
export const IndianMobileRegExp = /^[6-9]\d{9}$/;

/**
 * Username containing allowed characters with no consecutive . (dot / full stop) and must start with alphanumeric characters only
 * followed by @  
 * followed by one or more sub-domains and a domain of at least two alphanumeric characters and maximum of 63 allowed characters (alphanumeric and - (dash)) without starting and ending with - (dash) and . (dot / full stop) at the end  
 * followed by top level of the domain of at least two alphanumeric characters and maximum of 63 allowed characters (alphanumeric and - (dash)) without starting and ending with - (dash)
 */
export const EmailRegExp = /^[a-z0-9]+([.]?[a-z0-9!#$%&'*+=?^_`{|}~/-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
// export const EmailRegExp = /^[a-zA-Z0-9]+([.]?[a-zA-Z0-9!#$%&'*+=?^_`{|}~/-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/** 12 digits starting with 2 or higher */
export const AadharCardNumberRegExp = /^[2-9]\d{11}$/;

/**
 * AAAAA####A  
 * A represents alphabet (case insensitive) and # represents digit
 */
export const PanCardNumberRegExp = /^[a-zA-Z]{5}[0-9]{4}[a-zA-Z]$/;

/**
 * At least one uppercase letter  
 * At least one lowercase letter  
 * At least one digit  
 * At least one allowed special character  
 * Containing 8 to 16 allowed characters only  
 * Note: Do not exceed 16 character limit as bcryptjs hash ignores input beyond 72 bytes. It will lead to match all password prefix from 72 bytes till any.
 */
export const LoginPasswordRegExp = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[~!@#$%^&*\-_+=:;.?])[A-Za-z0-9~!@#$%^&*\-_+=:;.?]{8, 16}$/;