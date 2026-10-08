package eduupm.hsaas.auth;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.SerializationUtils;
import eduupm.hsaas.common.ApiFailure;

/** Reads actual JDBC session state without locking framework tables or refreshing expiry. */
@Component
public class SessionMetadata {
    private final JdbcTemplate jdbc;
    public SessionMetadata(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** The stable primary ID survives sessionId rotation in the pinned JDBC implementation. */
    public Projection bySessionId(String id) { return read("S.SESSION_ID", id); }
    /** Owner QR use reads its persisted session rather than copying a previous expiry value. */
    public Projection byPrimaryId(String id) { return read("S.PRIMARY_ID", id); }

    /** Decodes only our trusted String/Long attributes with the pinned default Spring serializer. */
    @SuppressWarnings("deprecation")
    private Projection read(String column, String id) {
        return jdbc.query("SELECT S.PRIMARY_ID,S.PRINCIPAL_NAME,S.EXPIRY_TIME,A.ATTRIBUTE_NAME,A.ATTRIBUTE_BYTES "
                + "FROM SPRING_SESSION S LEFT JOIN SPRING_SESSION_ATTRIBUTES A ON S.PRIMARY_ID=A.SESSION_PRIMARY_ID "
                + "AND A.ATTRIBUTE_NAME IN ('HSAAS_BINDING','HSAAS_CONTEXT','HSAAS_GENERATION') WHERE " + column + "=?",
                rs -> {
                    if (!rs.next()) { return null; }
                    String primary = rs.getString(1), principal = rs.getString(2);
                    Instant expiry = Instant.ofEpochMilli(rs.getLong(3));
                    Map<String, Object> attributes = new HashMap<>();
                    do {
                        if (rs.getString(4) != null) {
                            Object value = SerializationUtils.deserialize(rs.getBytes(5));
                            if (!(value instanceof String || value instanceof Long)) {
                                throw new ApiFailure(503, "SERVICE_UNAVAILABLE", "Session state unavailable.");
                            }
                            attributes.put(rs.getString(4), value);
                        }
                    } while (rs.next());
                    return new Projection(primary, principal, expiry, attributes);
                }, id);
    }

    /** Internal session IDs and attributes never appear in HTTP DTOs or logs. */
    public record Projection(String primaryId, String principal, Instant expiresAt, Map<String,Object> attributes) { }
}
