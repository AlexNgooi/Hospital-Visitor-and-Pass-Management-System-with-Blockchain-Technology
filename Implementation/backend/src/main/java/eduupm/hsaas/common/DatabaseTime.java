package eduupm.hsaas.common;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

/** DATETIME(6) represents UTC local fields, independent of the host/JDBC default timezone. */
public final class DatabaseTime {
    private DatabaseTime() { }
    /** Converts before JDBC binding so the driver cannot reinterpret the host timezone. */
    public static LocalDateTime sql(Instant value) {
        return LocalDateTime.ofInstant(value.truncatedTo(java.time.temporal.ChronoUnit.MICROS),ZoneOffset.UTC);
    }
    /** Restores an Instant from the deliberately timezone-free UTC database representation. */
    public static Instant instant(LocalDateTime value) { return value==null?null:value.toInstant(ZoneOffset.UTC); }
}
