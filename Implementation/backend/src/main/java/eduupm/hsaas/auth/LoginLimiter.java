package eduupm.hsaas.auth;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import eduupm.hsaas.common.ApiFailure;

/** Provides bounded single-instance login throttling without publishing account existence. */
@Component
public class LoginLimiter {
    private final Clock clock;
    private final Map<String,Bucket> buckets=new HashMap<>();
    public LoginLimiter(Clock clock) { this.clock=clock; }

    /** Counts canonical account and socket address independently; forwarded client headers are untrusted. */
    public synchronized void check(String account,String address) {
        long minute=clock.instant().getEpochSecond()/60;
        buckets.entrySet().removeIf(entry->entry.getValue().minute()<minute);
        count("ip:"+address,minute,60); count("account:"+account,minute,10);
    }
    /** Limits anonymous session creation, using the actual socket address rather than forwarded input. */
    public synchronized void checkBootstrap(String address) {
        long minute=clock.instant().getEpochSecond()/60;
        buckets.entrySet().removeIf(entry->entry.getValue().minute()<minute);
        count("bootstrap:"+address,minute,120);
    }
    /** Refuses excess new keys instead of allowing an attacker to grow or reset the limiter indefinitely. */
    private void count(String key,long minute,int limit) {
        Bucket old=buckets.get(key);
        if(old==null && buckets.size()>=10000) { throw limited(); }
        // Saturation preserves throttling even if an address sends an extreme number of requests.
        int next=old==null?1:Math.min(old.count(),limit)+1; buckets.put(key,new Bucket(minute,next));
        if(next>limit) { throw limited(); }
    }
    private ApiFailure limited() { return new ApiFailure(429,"RATE_LIMITED","Try again later."); }
    private record Bucket(long minute,int count) { }
}
