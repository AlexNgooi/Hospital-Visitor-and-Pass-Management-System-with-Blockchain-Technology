package eduupm.hsaas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** Test-only mapping of an existing Flyway table; production code contains no synthetic business entity. */
@Entity
@Table(name="counters")
public class CounterTransactionProbe {
    @Id private Long id;
    @Column(nullable=false,length=64) private String code;
    @Column(nullable=false,length=120) private String name;
    @Version private Long version;
    protected CounterTransactionProbe() { }
    /** Explicit fixture IDs avoid introducing a production identifier-generation contract. */
    public CounterTransactionProbe(long id) { this.id=id; code="JPA_FIXTURE_"+id; name="Synthetic transaction probe"; }
}
