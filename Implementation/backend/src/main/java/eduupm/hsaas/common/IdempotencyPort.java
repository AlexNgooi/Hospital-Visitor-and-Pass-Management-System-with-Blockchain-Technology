package eduupm.hsaas.common;

import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.config.FoundationProperties;

/** Stores only successful safe results in the domain transaction; uniqueness failure requires full rollback. */
@Service
public class IdempotencyPort {
    private static final Pattern KEY=Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}");
    private final JdbcTemplate jdbc;
    private final JsonMapper json;
    private final Clock clock;
    private final Map<String,byte[]> keys;
    private final String currentVersion;
    public IdempotencyPort(JdbcTemplate jdbc,JsonMapper json,Clock clock,FoundationProperties properties) {
        this.jdbc=jdbc; this.json=json; this.clock=clock; this.currentVersion=properties.hashKeyVersion();
        var configured=new java.util.HashMap<String,byte[]>();
        if(properties.hashKeys()!=null) { properties.hashKeys().forEach((version,key)->configured.put(version,decodeKey(key))); }
        if(properties.hashKey()!=null && !properties.hashKey().isEmpty()) { configured.put(currentVersion,decodeKey(properties.hashKey())); }
        if(configured.keySet().stream().anyMatch(version->version==null || !version.matches("[A-Za-z0-9_-]{1,64}"))) { throw new IllegalStateException("Invalid hash key version"); }
        keys=Map.copyOf(configured);
    }
    /** Missing old keys fail closed; secrets and hash inputs are never logged or returned. */
    public byte[] hash(byte[] encoded,String keyVersion) {
        byte[] key=keys.get(keyVersion);
        if(key==null) { throw new ApiFailure(503,"SERVICE_UNAVAILABLE","Command hashing is unavailable."); }
        try { var mac=Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(key,"HmacSHA256")); return mac.doFinal(encoded); }
        catch(java.security.GeneralSecurityException failure) { throw new IllegalStateException("Hashing unavailable"); }
    }
    /** The UUID header never substitutes for authenticated scope or object authorization. */
    public static String key(String value) {
        if(value==null || !KEY.matcher(value).matches()) { throw new ApiFailure(400,"VALIDATION_FAILED","Use a UUID v4 command key."); }
        return UUID.fromString(value).toString();
    }
    /** Invoke after current authorization; repeat this current read after acquiring all domain locks. */
    @Transactional(propagation=Propagation.MANDATORY)
    public Optional<StoredResult> replay(Namespace namespace,byte[] encoding) {
        var rows=jdbc.query("SELECT * FROM idempotency_records WHERE scope_kind=? AND scope_id=? AND operation=? AND target_ref=? AND command_key=?",
                (rs,n)-> new StoredResult(rs.getInt("http_status"),json.readValue(rs.getString("safe_result"),SafeResult.class),
                        rs.getBytes("request_hash"),rs.getString("hash_key_version"),rs.getInt("encoding_version"),DatabaseTime.instant(rs.getObject("expires_at",java.time.LocalDateTime.class))),
                namespace.scope().kind().name(),namespace.scope().id(),namespace.operation(),namespace.target(),key(namespace.key()));
        if(rows.isEmpty() || !clock.instant().isBefore(rows.getFirst().expiresAt())) { return Optional.empty(); }
        var result=rows.getFirst();
        if(result.encodingVersion()!=RequestEncoding.VERSION) {
            throw new ApiFailure(503,"SERVICE_UNAVAILABLE","Command encoding is unavailable.");
        }
        if(!MessageDigest.isEqual(result.hash(),hash(encoding,result.keyVersion()))) { throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT","Command key was already used for different input."); }
        return Optional.of(result);
    }
    /** Audit, business changes, and this insert either commit together or all roll back. */
    @Transactional(propagation=Propagation.MANDATORY)
    public void success(Namespace namespace,byte[] encoding,int httpStatus,SafeResult result) {
        if(httpStatus<200 || httpStatus>=300) { throw new IllegalArgumentException("Only successful commands are stored"); }
        var now=clock.instant();
        jdbc.update("INSERT INTO idempotency_records(scope_kind,scope_id,operation,target_ref,command_key,request_hash,encoding_version,hash_key_version,http_status,safe_result,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                namespace.scope().kind().name(),namespace.scope().id(),namespace.operation(),namespace.target(),key(namespace.key()),
                hash(encoding,currentVersion),RequestEncoding.VERSION,currentVersion,httpStatus,json.writeValueAsString(result),DatabaseTime.sql(now),DatabaseTime.sql(now.plus(Duration.ofHours(24))));
    }
    /** Invalid configuration fails startup without exposing its value. */
    private static byte[] decodeKey(String value) {
        try { byte[] bytes=Base64.getDecoder().decode(value); if(bytes.length<32) { throw new IllegalArgumentException(); } return bytes; }
        catch(IllegalArgumentException failure) { throw new IllegalStateException("Idempotency keys require at least 256 bits of Base64 secret material"); }
    }
    /** Domain ownership and endpoint target are resolved by the server before forming this namespace. */
    public record Namespace(RequestEncoding.Scope scope,String operation,String target,String key) {
        public Namespace {
            if(scope==null || operation==null || !operation.matches("[A-Z_]{3,64}") || target==null
                    || !target.matches("REGISTER|[0-9]+|[0-9a-f-]{36}")) { throw new IllegalArgumentException("Invalid command namespace"); }
        }
    }
    /** Results omit form/contact details and response headers. Domain owners supply only generated references. */
    public record SafeResult(String id,String reference,String status,long version) {
        public SafeResult {
            if(id==null || !id.matches("[0-9]+|[0-9a-f-]{36}") || (reference!=null && !reference.matches("[A-Za-z0-9_-]{1,128}"))
                    || !java.util.Set.of("SUBMITTED","VERIFIED","REJECTED","CANCELLED","ISSUED","RETURNED","OVERDUE","LOST","DISABLED","RESTORED").contains(status) || version<0) {
                throw new IllegalArgumentException("Invalid safe command result");
            }
        }
    }
    /** Internal hashing metadata is never a controller response. */
    public record StoredResult(int httpStatus,SafeResult result,byte[] hash,String keyVersion,int encodingVersion,java.time.Instant expiresAt) { }
}
