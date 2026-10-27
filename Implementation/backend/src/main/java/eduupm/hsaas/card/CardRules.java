package eduupm.hsaas.card;

import eduupm.hsaas.common.ApiFailure;

/** Explicit manual and historical inventory transitions never permit arbitrary PATCH or reopening a lost assignment. */
public final class CardRules {
    public static final long MAX_VERSION=9007199254740991L;
    private CardRules() { }
    public static void version(long actual,long expected) {
        if(actual!=expected || actual>=MAX_VERSION) throw new ApiFailure(409,"VERSION_CONFLICT","Refresh the record before continuing.");
    }
    public static void require(boolean condition,String code) {
        if(!condition) throw new ApiFailure(409,code,"The current record does not allow this action.");
    }
    public static ApiFailure unavailable() { return new ApiFailure(404,"NOT_FOUND","This lifecycle record is not available."); }
}
