package eduupm.hsaas.common;

/** C10's only safe typed error extension; references convey context, never bearer access to a form. */
public record RestartDetails(FormContext currentFormContext,Scope currentScope,Scope requestedScope) {
    /** Context versions remain numbers; database identities in scope are opaque decimal strings. */
    public record FormContext(String grantReference,long bindingVersion) {
        public FormContext {
            if(grantReference==null || !grantReference.matches("[A-Za-z0-9_-]{1,128}") || bindingVersion<0 || bindingVersion>9007199254740991L) {
                throw new IllegalArgumentException("Invalid form context");
            }
        }
    }
    /** Scope comes from the server challenge/display; no names, token, or original input are included. */
    public record Scope(String environment,String counterId,String categoryScope) {
        public Scope {
            if(!java.util.Set.of("production","development","synthetic","test").contains(environment)
                    || counterId==null || !counterId.matches("[0-9]{1,20}")
                    || (categoryScope!=null && !categoryScope.matches("[0-9]{1,20}"))) {
                throw new IllegalArgumentException("Invalid registration scope");
            }
        }
    }
}
