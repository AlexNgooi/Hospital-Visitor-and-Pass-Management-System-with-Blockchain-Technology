package eduupm.hsaas.registration;

import java.util.List;
import java.util.Map;
import eduupm.hsaas.auth.AccountChanges.Proof;

/** Root-owned, name-only admin projection; callers audit explicit views/exports before returning personal data. */
public interface RegistrationReportingPort {
    Map<String, String> reportNames(Proof proof, String environment, List<String> registrationIds);
}
