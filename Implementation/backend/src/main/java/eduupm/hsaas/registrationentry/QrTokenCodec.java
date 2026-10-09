package eduupm.hsaas.registrationentry;

import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.ApiFailure;

/** Uses reviewed JOSE primitives with one algorithm and a deliberately narrow non-PII payload. */
public final class QrTokenCodec {
    private final Map<String,byte[]> keys;
    private final String activeKey;
    private final JsonMapper json;
    /** All configured keys must be valid; missing material never generates a fallback secret. */
    public QrTokenCodec(QrProperties properties, JsonMapper json) {
        this.json=json; this.activeKey=properties.activeKey();
        try {
            var parsed=new java.util.HashMap<String,byte[]>();
            properties.keys().forEach((id,value)-> {
                byte[] key=Base64.getDecoder().decode(value);
                if(!id.matches("[A-Za-z0-9_-]{1,64}") || key.length<32) { throw new IllegalArgumentException(); }
                parsed.put(id,key);
            });
            keys=Map.copyOf(parsed);
            if(!keys.containsKey(activeKey)) { throw new IllegalArgumentException(); }
        } catch(RuntimeException invalid) { throw new IllegalStateException("QR requires an explicit active key and valid retained 256-bit keys"); }
    }
    /** Same challenge bytes and kid produce the same compact token across polling and instances. */
    public String encode(Payload payload, String keyId) {
        try {
            byte[] key=keys.get(keyId);
            if(key==null) { throw new ApiFailure(503,"SERVICE_UNAVAILABLE","Entry signing is unavailable."); }
            var header=new JWSHeader.Builder(JWSAlgorithm.HS256).type(new JOSEObjectType("hsaas-entry+jws")).keyID(keyId).build();
            var object=new JWSObject(header,new com.nimbusds.jose.Payload(json.writeValueAsString(payload)));
            object.sign(new MACSigner(key)); return object.serialize();
        } catch(JOSEException failure) { throw new ApiFailure(503,"SERVICE_UNAVAILABLE","Entry signing is unavailable."); }
    }
    /** Strict parsing precedes library verification; no header can redirect verification or choose another algorithm. */
    public Decoded decode(String token) {
        try {
            if(token==null || token.length()>2048 || !token.matches("[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+")) { throw new IllegalArgumentException(); }
            String[] parts=token.split("\\.");
            var header=json.readTree(Base64.getUrlDecoder().decode(parts[0]));
            if(header.size()!=3 || !fieldNames(header).equals(Set.of("alg","typ","kid"))
                    || !header.path("alg").isString() || !header.path("typ").isString() || !header.path("kid").isString()
                    || !header.path("alg").asString().equals("HS256") || !header.path("typ").asString().equals("hsaas-entry+jws")) { throw new IllegalArgumentException(); }
            String kid=header.path("kid").asString(); byte[] key=keys.get(kid);
            if(key==null) { throw new IllegalArgumentException(); }
            var object=JWSObject.parse(token);
            if(!object.verify(new MACVerifier(key))) { throw new IllegalArgumentException(); }
            Payload payload=json.readValue(Base64.getUrlDecoder().decode(parts[1]),Payload.class);
            if(payload.v()!=1 || payload.cid()==null || !payload.cid().matches("[0-9a-f-]{36}")
                    || payload.n()==null || !payload.n().matches("[A-Za-z0-9_-]{43}")
                    || payload.expiresAt()==null || !payload.expiresAt().matches(".*\\.[0-9]{6}Z")) { throw new IllegalArgumentException(); }
            Instant.parse(payload.expiresAt()); return new Decoded(payload,kid);
        } catch(Exception invalid) { throw new ApiFailure(400,"QR_ENTRY_INVALID","Please scan a fresh registration QR."); }
    }
    /** Header fields must match exactly, including rejection of duplicated JSON keys by the shared mapper. */
    private Set<String> fieldNames(tools.jackson.databind.JsonNode value) {
        var names=new java.util.HashSet<String>(); value.properties().forEach(entry->names.add(entry.getKey())); return names;
    }
    public String activeKey() { return activeKey; }
    public Set<String> keyIds() { return keys.keySet(); }
    /** Challenge references, nonce and expiry confer only the narrowly scoped entry capability. */
    public record Payload(int v,String cid,String n,String expiresAt) { }
    /** Internal verification result is never serialized by a controller. */
    public record Decoded(Payload payload,String keyId) { }
}
