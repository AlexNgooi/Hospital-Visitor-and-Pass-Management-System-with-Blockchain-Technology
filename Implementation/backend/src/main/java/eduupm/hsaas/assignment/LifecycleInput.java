package eduupm.hsaas.assignment;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.RequestEncoding;

/** Strict legacy-reader and local-exception commands retain original values; manual writes use ManualInput. */
final class LifecycleInput {
    private final JsonNode input;
    private final List<String> fields;
    private LifecycleInput(JsonNode input,List<String> fields) { this.input=input; this.fields=fields; }

    static LifecycleInput parse(JsonMapper json,String operation,String body) {
        List<String> fields=switch(operation) {
            case "SCAN_START" -> List.of("counterId","purpose","targetId");
            case "SCAN_SIMULATE" -> List.of("nonce","leaseToken","sampleCode");
            case "SCAN_CANCEL" -> List.of();
            case "MARK_LOST","DISABLE" -> List.of("expectedVersion","reasonCode");
            case "CONTACT_REVEAL" -> List.of("reasonCode");
            case "FOLLOWUP" -> List.of("reasonCode");
            default -> throw new IllegalArgumentException("Unknown lifecycle command");
        };
        try {
            if(body==null || body.length()>4096) throw invalid();
            var strict=json.rebuild().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
            var node=strict.readTree(body);
            if(node==null || !node.isObject() || node.size()!=fields.size()) throw invalid();
            for(var name:node.propertyNames()) if(!fields.contains(name)) throw invalid();
            var result=new LifecycleInput(node,fields);
            for(String field:fields) {
                if(field.equals("expectedVersion")) result.version();
                else if(Set.of("handoverConfirmed","physicalReceived","physicalFoundConfirmed","inventoryCheckedConfirmed").contains(field)) result.bool(field);
                else result.text(field);
            }
            return result;
        } catch(ApiFailure failure) { throw failure; }
        catch(RuntimeException failure) { throw invalid(); }
    }
    String text(String name) {
        var value=input.path(name);
        // All command strings are identifiers, enum codes or base64url capabilities, never free text or PII.
        if(!value.isString() || !value.asString().matches("[A-Za-z0-9_-]{1,128}")) throw invalid();
        return value.asString();
    }
    boolean bool(String name) { if(!input.path(name).isBoolean()) throw invalid(); return input.path(name).asBoolean(); }
    long version() {
        var value=input.path("expectedVersion");
        if(!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong()<0 || value.asLong()>9007199254740991L) throw invalid();
        return value.asLong();
    }
    byte[] encoding(JsonMapper json,RequestEncoding.Scope scope,String operation,String target) {
        var encoded=new ArrayList<RequestEncoding.Field>();
        for(String name:fields) {
            var value=input.path(name);
            if(value.isBoolean()) encoded.add(RequestEncoding.Field.bool(name,value.asBoolean()));
            else if(value.isIntegralNumber()) encoded.add(RequestEncoding.Field.integer(name,value.asLong()));
            else encoded.add(RequestEncoding.Field.text(name,text(name)));
        }
        return RequestEncoding.encode(json,scope,operation,target,1,encoded);
    }
    static String uuid(String value) {
        if(value==null || !value.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) throw invalid();
        return value;
    }
    static long decimal(String value) {
        try { if(value==null || !value.matches("[1-9][0-9]{0,18}")) throw invalid(); return Long.parseLong(value); }
        catch(NumberFormatException failure) { throw invalid(); }
    }
    static ApiFailure invalid() { return new ApiFailure(400,"VALIDATION_FAILED","Check the lifecycle command fields."); }
    @Override public String toString() { return "LifecycleInput[REDACTED]"; }
}
