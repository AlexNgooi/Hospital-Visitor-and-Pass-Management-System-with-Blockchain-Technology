package eduupm.hsaas.registrationentry;

import java.time.Clock;
import java.util.HashMap;
import org.springframework.stereotype.Component;
import eduupm.hsaas.common.ApiFailure;

/** Bounded per-process exchange throttling uses trusted socket/binding coordinates, never token contents. */
@Component
public class EntryLimiter {
    private final Clock clock;
    private final HashMap<String,Bucket> buckets=new HashMap<>();
    public EntryLimiter(Clock clock) { this.clock=clock; }
    /** Engineering defaults permit shared NAT visitors while fencing repeated exchanges from one browser. */
    public synchronized void check(String binding,String remoteAddress) {
        long minute=clock.instant().getEpochSecond()/60;
        buckets.entrySet().removeIf(entry->entry.getValue().minute()!=minute);
        if(buckets.size()>=10000) { throw limited(); }
        increment("binding:"+binding,30,minute);increment("socket:"+remoteAddress,300,minute);
    }
    private void increment(String key,int limit,long minute) {
        Bucket current=buckets.getOrDefault(key,new Bucket(minute,0));
        if(current.count()>=limit) { throw limited(); }buckets.put(key,new Bucket(minute,current.count()+1));
    }
    private ApiFailure limited() { return new ApiFailure(429,"RATE_LIMITED","Please wait before scanning again."); }
    private record Bucket(long minute,int count) { }
}
