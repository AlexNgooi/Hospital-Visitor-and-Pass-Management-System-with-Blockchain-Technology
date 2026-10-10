package eduupm.hsaas.registration;

import eduupm.hsaas.common.ApiFailure;

/** Keeps optimistic versions exact across Java, MySQL and JavaScript, including the terminal safe-integer boundary. */
public final class RegistrationVersions {
    public static final long MAX_SAFE = 9_007_199_254_740_991L;

    private RegistrationVersions() { }

    /** Negative, wrapped and inexact wire versions are not valid command preconditions. */
    public static long checked(long version) {
        if (version < 0 || version > MAX_SAFE) {
            throw new ApiFailure(400, "VALIDATION_FAILED", "Check the registration version.");
        }
        return version;
    }

    /** A terminal version fails closed; it must never wrap to an apparently fresh registration. */
    public static long next(long version) {
        checked(version);
        if (version == MAX_SAFE) {
            throw new ApiFailure(409, "VERSION_CONFLICT", "Registration version cannot advance.");
        }
        return version + 1;
    }
}
