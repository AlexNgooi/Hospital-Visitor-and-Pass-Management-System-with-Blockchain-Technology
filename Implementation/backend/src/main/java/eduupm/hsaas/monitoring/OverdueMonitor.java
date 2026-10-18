package eduupm.hsaas.monitoring;

import org.springframework.scheduling.annotation.Scheduled;
import eduupm.hsaas.assignment.LifecycleService;

/** Bounded local alert materialization is restart-safe; request/report due predicates remain correct before the next tick. */
public final class OverdueMonitor {
    private final LifecycleService service;
    public OverdueMonitor(LifecycleService service) { this.service=service; }
    @Scheduled(fixedDelay=30000,initialDelay=30000)
    public void tick() { service.markOverdueBatch(); }
}
