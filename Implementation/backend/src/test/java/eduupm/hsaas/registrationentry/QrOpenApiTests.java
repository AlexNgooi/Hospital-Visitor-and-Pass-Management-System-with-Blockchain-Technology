package eduupm.hsaas.registrationentry;

import java.lang.reflect.Method;
import java.lang.reflect.RecordComponent;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.common.RestartDetails;
import eduupm.hsaas.config.FoundationConfig;
import static org.assertj.core.api.Assertions.*;

/** Generates the module-only OpenAPI from implemented controller mappings and record DTOs; M00's spec is immutable. */
class QrOpenApiTests {
    private final Map<String,Object> schemas=new TreeMap<>();
    /** Normal verify validates the checked artifact; explicit generation rewrites only this module's evidence spec. */
    @Test void moduleContractMatchesControllers() throws Exception {
        var json=new FoundationConfig().jsonMapper();
        var paths=new TreeMap<String,Object>();
        for(Class<?> controller:List.of(QrController.class,QrCapabilitiesController.class)) {
            for(Method method:controller.getDeclaredMethods()) {
                var get=method.getAnnotation(GetMapping.class);var post=method.getAnnotation(PostMapping.class);
                if(get==null && post==null) { continue; }
                String path=(get!=null?get.value():post.value())[0],verb=get!=null?"get":"post";
                var operation=new LinkedHashMap<String,Object>();operation.put("operationId","qr_"+method.getName());
                boolean publicPath=path.startsWith("/api/public/");boolean capability=path.endsWith("/capabilities");
                operation.put("security",capability?List.of():List.of(post!=null?Map.of("SessionCookie",List.of(),"CsrfHeader",List.of()):Map.of("SessionCookie",List.of())));
                if(!publicPath) { operation.put("x-required-role","COUNTER_STAFF"); }
                if(path.contains("{id}")) { operation.put("parameters",List.of(Map.of("name","id","in","path","required",true,"schema",Map.of("type","string","format","uuid")))); }
                for(var parameter:method.getParameters()) {
                    if(parameter.isAnnotationPresent(RequestBody.class)) {
                        operation.put("requestBody",Map.of("required",true,"content",Map.of("application/json",Map.of("schema",reference(parameter.getType())))));
                    }
                }
                var responses=new TreeMap<String,Object>();
                String success=method.getReturnType()==void.class?"204":method.getName().equals("create")?"201":"200";
                var ok=new LinkedHashMap<String,Object>();ok.put("description","Confirmed success; no-store and no-referrer");
                if(method.getReturnType()!=void.class) { ok.put("content",Map.of("application/json",Map.of("schema",reference(method.getReturnType())))); }
                responses.put(success,ok);
                for(String status:List.of("400","401","403","404","409","410","429","503")) {
                    if(!capability) { responses.put(status,Map.of("description","Safe error; 409 includes disabled/context/restart boundaries","content",Map.of("application/json",Map.of("schema",Map.of("$ref","#/components/schemas/Error"))))); }
                }
                operation.put("responses",responses);paths.put(path,Map.of(verb,operation));
            }
        }
        reference(RestartDetails.class);
        var foundation=json.readTree(Path.of("../docs/evidence/modules/M00/openapi.json"));
        schemas.put("Error",foundation.path("components").path("schemas").path("Error"));
        schemas.put("FieldError",foundation.path("components").path("schemas").path("FieldError"));
        var document=Map.of("openapi","3.1.0","info",Map.of("title","HSAAS M02 Dynamic Registration Entry API","version","1.0.0","description","Generated from implemented controllers/records. Entry references are not bearer authorization; scope is server-resolved. Enabled state is explicit. No M03 registration submission implementation."),
                "servers",List.of(Map.of("url","/")),"paths",paths,"components",Map.of("schemas",schemas,"securitySchemes",Map.of("SessionCookie",Map.of("type","apiKey","in","cookie","name","HSAAS_SESSION"),"CsrfHeader",Map.of("type","apiKey","in","header","name","X-CSRF-TOKEN"))));
        Path output=Path.of("../docs/evidence/modules/M02/openapi.json");
        if(Boolean.getBoolean("m02.generateOpenApi")) { Files.createDirectories(output.getParent());Files.writeString(output,json.writerWithDefaultPrettyPrinter().writeValueAsString(document)+"\n"); }
        assertThat(paths).hasSize(6);assertThat(Files.exists(output)).isTrue();
        assertThat(json.readTree(output)).isEqualTo(json.valueToTree(document));
    }
    /** DTO shape comes from record fields; explicit wire constraints mirror checked module/service invariants. */
    private Map<String,String> reference(Class<?> type) {
        if(schemas.containsKey(type.getSimpleName())) { return Map.of("$ref","#/components/schemas/"+type.getSimpleName()); }
        var properties=new TreeMap<String,Object>();var required=new ArrayList<String>();
        schemas.put(type.getSimpleName(),Map.of());
        for(RecordComponent field:type.getRecordComponents()) {
            String name=field.getName();Class<?> value=field.getType();Object shape;
            boolean optional=(type==QrEntryService.CreateRequest.class && name.equals("categoryScope"))
                    || (type==QrEntryService.ExchangeRequest.class && !name.equals("entryToken"));
            if(value==String.class) {
                var attributes=new LinkedHashMap<String,Object>();attributes.put("type",name.equals("categoryScope")?List.of("string","null"):"string");
                if(name.equals("bindingVersion")) { throw new IllegalStateException("Wire version must remain numeric"); }
                if(name.endsWith("At") || name.equals("serverNow")) { attributes.put("format","date-time");attributes.put("pattern","^.*\\.[0-9]{6}Z$"); }
                if(name.equals("entryToken")) { attributes.put("maxLength",2048); }
                if(name.equals("counterId") || name.equals("categoryScope")) { attributes.put("pattern","^[0-9]{1,20}$"); }
                if(name.equals("displaySessionId")) { attributes.put("format","uuid"); }
                if(name.equals("grantReference")) { attributes.put("maxLength",128);attributes.put("pattern","^[A-Za-z0-9_-]{1,128}$"); }
                shape=attributes;
            } else if(value==long.class) { shape=Map.of("type","integer","minimum",0,"maximum",9007199254740991L); }
            else if(value==boolean.class || value==Boolean.class) { shape=Map.of("type",value==Boolean.class?List.of("boolean","null"):"boolean"); }
            else { shape=optional?Map.of("anyOf",List.of(reference(value),Map.of("type","null"))):reference(value); }
            properties.put(name,shape);if(!optional) { required.add(name); }
        }
        schemas.put(type.getSimpleName(),Map.of("type","object","additionalProperties",false,"properties",properties,"required",required));
        return Map.of("$ref","#/components/schemas/"+type.getSimpleName());
    }
}
