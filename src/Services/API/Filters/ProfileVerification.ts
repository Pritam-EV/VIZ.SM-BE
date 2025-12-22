import { HttpError } from "../../../Shared/Common/CustomErrors/HttpErrors.js";
import { ResponseStatus } from "../../../Shared/Common/Enums/Http.js";
import type { ProfileFlags } from "../../../Shared/Common/Enums/Member.js";
import type { RequestWithUser } from "../../../Shared/Common/Types/ApiTypes.js";

export default async function verifyProfile(req: RequestWithUser, profile: ProfileFlags, ...alternativeProfiles: ProfileFlags[]) {
    if (!(req.customContext.user.roles
        && (((req.customContext.user.roles & profile) === profile)
            || (alternativeProfiles?.length > 0 && alternativeProfiles.findIndex(p => (req.customContext.user.roles & p) === p) > -1)
        ))
    ) {
        throw new HttpError(ResponseStatus.Unauthorized, `Profile not authorized. Actual: ${req.customContext.user.roles} Expected: ${profile} Alternative: ${alternativeProfiles}`);
    }
}