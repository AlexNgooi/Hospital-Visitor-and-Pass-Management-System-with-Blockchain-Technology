package eduupm.hsaas.registration;

import java.util.Base64;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

/** Verifies privacy-relevant wire bounds, including corrupt/short source values and M04's reference prefix. */
class RegistrationMaskingTests {
    /** Operational labels never expose a full name or identifier, even with Unicode and unexpected separators. */
    @Test void limitsIdentityDisclosureAndFullyMasksShortValues() {
        assertThat(RegistrationMasking.name("Ahmad Demo Visitor")).isEqualTo("A***");
        assertThat(RegistrationMasking.name("李明演示")).isEqualTo("李***");
        assertThat(RegistrationMasking.name("123")).isEqualTo("***");
        assertThat(RegistrationMasking.identification("DEMO-ABC1234")).isEqualTo("***1234");
        assertThat(RegistrationMasking.identification("DEMO-MRN-ZX4821")).isEqualTo("***4821");
        assertThat(RegistrationMasking.identification("1234")).isEqualTo("***");
        assertThat(RegistrationMasking.phone("+999123456789")).isEqualTo("***6789");
        assertThat(RegistrationMasking.phone("123")).isEqualTo("***");
        assertThat(RegistrationMasking.phone(null)).isEqualTo("***");
    }

    /** Catalogue control characters/overflow cannot invalidate strict detail DTOs or disturb the page. */
    @Test void rejectsUncontrolledLabelsWithoutTruncatingThem() {
        assertThat(RegistrationMasking.destination("Demo Ward A")).isEqualTo("Demo Ward A");
        assertThat(RegistrationMasking.destination("demo\npatient label")).isEqualTo("Lokasi demo");
        assertThat(RegistrationMasking.destination("A".repeat(121))).isEqualTo("Lokasi demo");
        assertThat(RegistrationMasking.destination("\u202eHidden")).isEqualTo("Lokasi demo");
    }

    /** Prefix/entropy encoding interoperates with M04's already-reviewed strict receipt wire. */
    @Test void publicReferenceMatchesSharedWireAndCarries128RandomBits() {
        String reference = PublicReferences.next();
        assertThat(reference).matches("R-[A-Za-z0-9_-]{22}");
        assertThat(Base64.getUrlDecoder().decode(reference.substring(2))).hasSize(16);
    }
}
