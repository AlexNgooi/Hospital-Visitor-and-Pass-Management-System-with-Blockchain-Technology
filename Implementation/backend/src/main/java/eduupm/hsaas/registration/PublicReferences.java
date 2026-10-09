package eduupm.hsaas.registration;

import java.security.SecureRandom;
import java.util.Base64;

/** Generates a non-sensitive receipt label; possession never authorizes retrieval of visitor data. */
public final class PublicReferences {
    private static final SecureRandom RANDOM = new SecureRandom();

    private PublicReferences() { }

    /** Uses 128 random bits, independent of database IDs, phone numbers, MRNs and submission time. */
    public static String next() {
        byte[] entropy = new byte[16];
        RANDOM.nextBytes(entropy);
        return "R_" + Base64.getUrlEncoder().withoutPadding().encodeToString(entropy);
    }
}
