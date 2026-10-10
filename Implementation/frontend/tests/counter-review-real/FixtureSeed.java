import java.sql.DriverManager;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;

/** Reference-only seed and bounded faults for the owned M04 container; registration roots are created through actual public HTTP. */
class FixtureSeed {
    /** Accept only the exact disposable URL/user; no arbitrary SQL/action or developer database fallback exists. */
    public static void main(String[] args) throws Exception {
        String url = System.getenv("HSAAS_DB_URL");
        if (url == null || !url.matches("jdbc:mysql://127\\.0\\.0\\.1:(?!3306(?:/|$))[0-9]+/hsaas_m04_integration\\?.*")
                || !"m04_integration".equals(System.getenv("HSAAS_DB_USER")) || args.length != 1) {
            throw new IllegalStateException("Owned disposable M04 fixture required");
        }
        try (var connection = DriverManager.getConnection(url, System.getenv("HSAAS_DB_USER"), System.getenv("HSAAS_DB_PASSWORD"));
                var statement = connection.createStatement()) {
            switch (args[0]) {
                case "seed" -> {
                    try (var count = statement.executeQuery("SELECT COUNT(*) FROM users")) {
                        count.next(); if (count.getInt(1) != 0) throw new IllegalStateException("Seed requires a new empty database");
                    }
                    var encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
                    try (var insert = connection.prepareStatement("INSERT INTO users(id,login,password_hash,role,created_at,updated_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")) {
                        for (var fixture : new String[][] {{"101", "review_a", "COUNTER_STAFF"}, {"102", "review_b", "COUNTER_STAFF"}, {"103", "review_admin", "ADMIN"}}) {
                            insert.setLong(1, Long.parseLong(fixture[0])); insert.setString(2, fixture[1]);
                            insert.setString(3, encoder.encode(System.getenv("M04_FIXTURE_PASSWORD"))); insert.setString(4, fixture[2]); insert.executeUpdate();
                        }
                    }
                    statement.executeUpdate("INSERT INTO counters(id,code,name) VALUES(1,'M04_BROWSER','Synthetic review counter')");
                    statement.executeUpdate("INSERT INTO user_counter_permissions(user_id,counter_id) VALUES(101,1),(102,1)");
                    statement.executeUpdate("INSERT INTO visitor_categories(id,code,name) VALUES(1,'EXECUTIVE','Executive'),(2,'PENJAGA','Penjaga'),(3,'VENDOR','Vendor'),(4,'CONTRACTOR','Contractor')");
                    statement.executeUpdate("INSERT INTO destinations(id,code,name) VALUES(1,'M04_WARD','Synthetic Ward'),(2,'M04_OFFICE','Synthetic Office')");
                }
                case "audit-fault" -> statement.execute("CREATE TRIGGER m04_browser_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW BEGIN IF NEW.action IN ('REGISTRATION_VERIFIED','REGISTRATION_REJECTED') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='M04_DISPOSABLE_AUDIT_FAULT'; END IF; END");
                case "clear-fault" -> statement.execute("DROP TRIGGER IF EXISTS m04_browser_audit_failure");
                // Test-only epoch invalidation exercises actual M00 current-session enforcement, without implementing M06.
                case "revoke-staff" -> statement.executeUpdate("UPDATE users SET security_epoch=security_epoch+1 WHERE login='review_a'");
                default -> throw new IllegalArgumentException("Unknown M04 fixture action");
            }
        }
        System.out.println("PASS owned M04 reference/fault action");
    }
}
