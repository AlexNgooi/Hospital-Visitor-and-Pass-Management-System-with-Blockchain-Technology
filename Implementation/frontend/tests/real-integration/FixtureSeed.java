import java.sql.DriverManager;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;

/** Seeds or faults only the disposable M01 database; never performs administrator bootstrap. */
class FixtureSeed {
    /** Fixed actions cannot accept arbitrary SQL or a native MySQL URL. Credentials stay in process memory. */
    public static void main(String[] args) throws Exception {
        String url = System.getenv("HSAAS_DB_URL");
        if (url == null || !url.matches("jdbc:mysql://127\\.0\\.0\\.1:(?!3306(?:/|$))[0-9]+/hsaas_m01_integration\\?.*")
                || !"m01_integration".equals(System.getenv("HSAAS_DB_USER"))) {
            throw new IllegalStateException("Disposable fixture database required");
        }
        try (var connection = DriverManager.getConnection(url, System.getenv("HSAAS_DB_USER"), System.getenv("HSAAS_DB_PASSWORD"));
             var statement = connection.createStatement()) {
            switch (args[0]) {
                case "seed" -> {
                    try (var count = statement.executeQuery("SELECT COUNT(*) FROM users")) {
                        count.next();
                        if (count.getInt(1) != 0) throw new IllegalStateException("Seed requires empty users");
                    }
                    // IDs beyond JavaScript's safe integer range prove decimal-string wire preservation.
                    var encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
                    try (var insert = connection.prepareStatement("INSERT INTO users(id,login,password_hash,role,created_at,updated_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")) {
                        for (var fixture : new String[][] {
                                {"9007199254740993", "staff_integration", "COUNTER_STAFF"},
                                {"9007199254740995", "admin_integration", "ADMIN"}}) {
                            insert.setLong(1, Long.parseLong(fixture[0])); insert.setString(2, fixture[1]);
                            insert.setString(3, encoder.encode(System.getenv("M01_FIXTURE_PASSWORD")));
                            insert.setString(4, fixture[2]); insert.executeUpdate();
                        }
                    }
                    statement.executeUpdate("INSERT INTO counters(id,code,name) VALUES(9007199254741001,'M01_SYNTHETIC','M01 temporary integration counter')");
                    statement.executeUpdate("INSERT INTO user_counter_permissions(user_id,counter_id) VALUES(9007199254740993,9007199254741001)");
                    System.out.println("PASS disposable synthetic staff/admin/counter seed");
                }
                // The real JDBC deletion fails after M00's durable revocation barrier commits.
                case "logout-fault" -> statement.execute("CREATE TRIGGER m01_session_delete_fault BEFORE DELETE ON SPRING_SESSION FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='M01_DISPOSABLE_DELETE_FAULT'");
                case "clear-fault" -> statement.execute("DROP TRIGGER IF EXISTS m01_session_delete_fault");
                // This isolated fixture mutation tests current-epoch invalidation without implementing M06.
                case "revoke-staff" -> statement.executeUpdate("UPDATE users SET security_epoch=security_epoch+1 WHERE login='staff_integration'");
                default -> throw new IllegalArgumentException("Unknown fixture action");
            }
        }
    }
}
