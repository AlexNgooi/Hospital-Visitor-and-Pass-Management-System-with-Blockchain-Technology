package eduupm.hsaas.registrationentry;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** Server epoch anchors every slot; a late GET can never move its 30/45-second boundaries. */
public record RotationWindow(long slot,Instant issuedAt,Instant rotateAt,Instant expiresAt) {
    /** Only observed slots are created; idle displays do not need a scheduler or unused challenges. */
    public static RotationWindow at(Instant epoch,Instant now) {
        epoch=epoch.truncatedTo(ChronoUnit.MICROS);
        if(now.isBefore(epoch)) { throw new IllegalStateException("Server time precedes display epoch"); }
        long slot=Duration.between(epoch,now).getSeconds()/30;
        Instant start=epoch.plusSeconds(Math.multiplyExact(slot,30));
        return new RotationWindow(slot,start,start.plusSeconds(30),start.plusSeconds(45));
    }
}
