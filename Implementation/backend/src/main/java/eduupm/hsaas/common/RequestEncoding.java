package eduupm.hsaas.common;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import tools.jackson.databind.json.JsonMapper;

/** Explicit C11 DTO encoding; it is not a general-purpose canonical JSON implementation. */
public final class RequestEncoding {
    public static final int VERSION=1;
    private RequestEncoding() { }

    /** Domain owners supply a fixed field schema in order; parsed JSON property order is irrelevant. */
    public static byte[] encode(JsonMapper json,Scope scope,String operation,String target,int dtoVersion,List<Field> fields) {
        if(!operation.matches("[A-Z_]{3,64}") || target==null || target.length()>128 || dtoVersion<1) { throw invalid(); }
        var encoded=new ArrayList<Object>(); var names=new HashSet<String>();
        for(Field field:fields) {
            if(!field.name().matches("[a-zA-Z][a-zA-Z0-9]{0,63}") || !names.add(field.name())) { throw invalid(); }
            encoded.add(field.wire());
        }
        return json.writeValueAsBytes(List.of("HSAAS_REQUEST",VERSION,scope.kind().name(),scope.id(),operation,target,dtoVersion,encoded));
    }
    /** Rejects unpaired surrogates instead of allowing different encoders to replace them differently. */
    private static String checked(String value) {
        if(value==null || value.length()>8192) { throw invalid(); }
        for(int i=0;i<value.length();i++) {
            char character=value.charAt(i);
            if(Character.isHighSurrogate(character)) {
                if(++i>=value.length() || !Character.isLowSurrogate(value.charAt(i))) { throw invalid(); }
            } else if(Character.isLowSurrogate(character)) { throw invalid(); }
        }
        return value;
    }
    private static ApiFailure invalid() { return new ApiFailure(400,"VALIDATION_FAILED","Check the request fields."); }
    /** Scope is obtained from Session/account state, never from the submitted DTO. */
    public record Scope(Kind kind,String id) {
        public Scope { if(kind==null || id==null || !id.matches("[0-9]+|[0-9a-f-]{36}")) { throw invalid(); } }
    }
    public enum Kind { USER,ANONYMOUS }
    /** Presence is encoded independently of value so omitted and null remain different commands. */
    public record Field(String name,List<Object> wire) {
        public Field { wire=List.copyOf(wire); }
        public static Field missing(String name) { return new Field(name,List.of(name,"MISSING")); }
        public static Field nil(String name) { return new Field(name,List.of(name,"NULL")); }
        public static Field text(String name,String value) { return new Field(name,List.of(name,"VALUE","STRING",checked(value))); }
        public static Field integer(String name,long value) { return new Field(name,List.of(name,"VALUE","INTEGER",Long.toString(value))); }
        public static Field bool(String name,boolean value) { return new Field(name,List.of(name,"VALUE","BOOLEAN",value)); }
        /** Timestamp fields use fixed microseconds; finer caller precision is rejected instead of silently changed. */
        public static Field instant(String name,java.time.Instant value) {
            if(value==null || value.getNano()%1000!=0) { throw invalid(); }
            String wireTime=new java.time.format.DateTimeFormatterBuilder().appendInstant(6).toFormatter().format(value);
            return new Field(name,List.of(name,"VALUE","UTC_INSTANT",wireTime));
        }
        /** Sets have documented semantic order; duplicate values are invalid rather than silently discarded. */
        public static Field enumSet(String name,Collection<String> values) {
            var copy=values.stream().map(RequestEncoding::checked).sorted().toList();
            if(new HashSet<>(copy).size()!=copy.size() || copy.stream().anyMatch(value->!value.matches("[A-Z_]{1,64}"))) { throw invalid(); }
            return new Field(name,List.of(name,"VALUE","ENUM_SET",copy));
        }
        /** Nested DTO fields retain their explicit schema order. */
        public static Field object(String name,List<Field> fields) { return new Field(name,List.of(name,"VALUE","OBJECT",fields.stream().map(Field::wire).toList())); }
        /** Ordinary arrays retain order; the caller may not silently treat them as sets. */
        public static Field texts(String name,List<String> values) { return new Field(name,List.of(name,"VALUE","ARRAY",values.stream().map(RequestEncoding::checked).toList())); }
    }
}
