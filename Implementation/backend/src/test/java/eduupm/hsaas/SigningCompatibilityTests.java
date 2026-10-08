package eduupm.hsaas;

import org.junit.jupiter.api.Test;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import static org.assertj.core.api.Assertions.*;

/** Verifies the pinned signing dependency only; this is not registration QR lifecycle evidence. */
class SigningCompatibilityTests {
    /** Synthetic public key material proves HS256 support, wrong-key rejection, and payload integrity. */
    @Test void hs256IntegrityAndKeyLength() throws Exception {
        byte[] fixtureKey=new byte[32]; fixtureKey[0]=1;
        var token=new JWSObject(new JWSHeader.Builder(JWSAlgorithm.HS256).type(new JOSEObjectType("hsaas-entry+jws")).keyID("fixture-v1").build(),new Payload("{\"v\":1,\"cid\":\"fixture\"}"));
        token.sign(new MACSigner(fixtureKey));
        var parsed=JWSObject.parse(token.serialize());
        assertThat(parsed.verify(new MACVerifier(fixtureKey))).isTrue();
        assertThat(JWSObject.parse(token.serialize()).verify(new MACVerifier(new byte[32]))).isFalse();
        String[] segments=token.serialize().split("\\.");
        segments[1]=java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("{\"v\":1,\"cid\":\"tampered\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(JWSObject.parse(String.join(".",segments)).verify(new MACVerifier(fixtureKey))).isFalse();
        assertThatThrownBy(()->new MACSigner(new byte[31])).isInstanceOf(KeyLengthException.class);
    }
}
