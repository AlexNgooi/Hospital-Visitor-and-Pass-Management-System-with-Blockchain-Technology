package eduupm.hsaas.assignment;

import java.time.Instant;
import java.util.*;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.RequestEncoding;

/** Strict manual commands distinguish an explicit null deadline from an omitted choice. */
final class ManualInput {
    private final JsonNode node;
    private ManualInput(JsonNode node) { this.node=node; }
    static ManualInput parse(JsonMapper json,String operation,String body) {
        try {
            if(body==null || body.length()>32768) throw LifecycleInput.invalid();
            var strict=json.rebuild().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
            var node=strict.readTree(body);
            var fields=switch(operation) {
                case "CARD_ENROLL" -> Set.of("cardCode","categoryCode","destinationId");
                case "ISSUE" -> Set.of("registrationId","expectedVersion","handoverConfirmed","passes");
                case "RETURN" -> Set.of("expectedVersion","physicalReceived");
                case "RETURN_BATCH" -> Set.of("registrationId","physicalReceived","passes");
                case "RESTORE" -> Set.of("expectedVersion","physicalFoundConfirmed","inventoryCheckedConfirmed","reasonCode");
                default -> throw LifecycleInput.invalid();
            };
            exact(node,fields);
            var result=new ManualInput(node);
            for(String field:fields) {
                if(field.equals("passes")) result.passes(operation.equals("ISSUE"));
                else if(field.equals("expectedVersion")) version(node);
                else if(field.endsWith("Confirmed") || field.equals("physicalReceived")) result.bool(field);
                else result.text(field);
            }
            return result;
        } catch(eduupm.hsaas.common.ApiFailure failure) { throw failure; }
        catch(RuntimeException failure) { throw LifecycleInput.invalid(); }
    }
    private static void exact(JsonNode node,Set<String> fields) {
        if(node==null || !node.isObject() || node.size()!=fields.size()) throw LifecycleInput.invalid();
        for(String name:node.propertyNames()) if(!fields.contains(name)) throw LifecycleInput.invalid();
    }
    String text(String name) { return text(node,name); }
    private static String text(JsonNode object,String name) {
        var value=object.path(name);
        if(!value.isString() || !value.asString().matches("[A-Za-z0-9_-]{1,64}")) throw LifecycleInput.invalid();
        return value.asString();
    }
    boolean bool(String name) {
        if(!node.path(name).isBoolean()) throw LifecycleInput.invalid();
        return node.path(name).asBoolean();
    }
    long version() { return version(node); }
    private static long version(JsonNode object) {
        var value=object.path("expectedVersion");
        if(!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong()<0 || value.asLong()>9007199254740991L) throw LifecycleInput.invalid();
        return value.asLong();
    }
    /** Array order remains part of command identity; locks use a separate sorted copy. */
    List<Selection> passes(boolean issue) {
        var array=node.path("passes");
        if(!array.isArray() || array.size()<1 || array.size()>50) throw LifecycleInput.invalid();
        var result=new ArrayList<Selection>(); var identifiers=new HashSet<String>();
        for(var item:array) {
            exact(item,issue?Set.of("cardId","expectedVersion","destinationId","dueAt"):Set.of("assignmentId","expectedVersion"));
            String id=LifecycleInput.uuid(text(item,issue?"cardId":"assignmentId"));
            if(!identifiers.add(id)) throw LifecycleInput.invalid();
            String destination=issue?Long.toString(LifecycleInput.decimal(text(item,"destinationId"))):null;
            Instant due=null;
            if(issue && !item.path("dueAt").isNull()) {
                if(!item.path("dueAt").isString() || !item.path("dueAt").asString().endsWith("Z")) throw LifecycleInput.invalid();
                due=Instant.parse(item.path("dueAt").asString());
                if(due.getNano()%1000!=0 || due.isBefore(Instant.parse("1000-01-01T00:00:00Z"))
                        || due.isAfter(Instant.parse("9999-12-31T23:59:59.999999Z"))) throw LifecycleInput.invalid();
            }
            result.add(new Selection(id,version(item),destination,due));
        }
        return List.copyOf(result);
    }
    /** Nested canonical fields retain null/type/presence and every selected version for replay checks. */
    byte[] encoding(JsonMapper json,RequestEncoding.Scope scope,String operation,String target) {
        var fields=new ArrayList<RequestEncoding.Field>();
        for(String name:new TreeSet<>(node.propertyNames())) {
            var value=node.path(name);
            if(name.equals("passes")) {
                var nested=new ArrayList<RequestEncoding.Field>(); int index=0;
                for(var selection:passes(operation.equals("ISSUE"))) {
                    var row=new ArrayList<RequestEncoding.Field>();
                    row.add(RequestEncoding.Field.text("id",selection.id()));
                    row.add(RequestEncoding.Field.integer("expectedVersion",selection.version()));
                    if(operation.equals("ISSUE")) {
                        row.add(RequestEncoding.Field.text("destinationId",selection.destination()));
                        row.add(selection.due()==null?RequestEncoding.Field.nil("dueAt"):RequestEncoding.Field.instant("dueAt",selection.due()));
                    }
                    nested.add(RequestEncoding.Field.object("pass"+index++,row));
                }
                fields.add(RequestEncoding.Field.object(name,nested));
            } else if(value.isBoolean()) fields.add(RequestEncoding.Field.bool(name,value.asBoolean()));
            else if(value.isIntegralNumber()) fields.add(RequestEncoding.Field.integer(name,value.asLong()));
            else fields.add(RequestEncoding.Field.text(name,text(name)));
        }
        return RequestEncoding.encode(json,scope,operation,target,2,fields);
    }
    record Selection(String id,long version,String destination,Instant due) { }
    @Override public String toString() { return "ManualInput[REDACTED]"; }
}
