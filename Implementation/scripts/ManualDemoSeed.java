import java.sql.DriverManager;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;

/** Seeds public synthetic identities/reference data only in the dedicated native demonstration schema. */
class ManualDemoSeed {
    /** Refuses unrelated schemas/accounts and any populated identity store; inserts share one transaction. */
    public static void main(String[] args) throws Exception {
        String url = System.getenv("HSAAS_DB_URL");
        if (args.length != 0 || url == null
                || !url.matches("jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/hsaas_manual_native\\?connectionTimeZone=UTC")
                || !"hsaas_manual_native".equals(System.getenv("HSAAS_DB_USER"))) {
            throw new IllegalStateException("The dedicated native demonstration schema/account is required");
        }
        try (var connection = DriverManager.getConnection(url, System.getenv("HSAAS_DB_USER"), System.getenv("HSAAS_DB_PASSWORD"))) {
            connection.setAutoCommit(false);
            try (var statement = connection.createStatement()) {
                try (var rows = statement.executeQuery("SELECT COUNT(*) FROM users")) {
                    rows.next();
                    if (rows.getLong(1) != 0) throw new IllegalStateException("Demonstration seed requires empty identities");
                }
                var encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
                try (var insert = connection.prepareStatement("INSERT INTO users(id,login,password_hash,role,created_at,updated_at) VALUES(?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))")) {
                    // These public demonstration credentials must never be reused for real environments.
                    for (var account : new String[][] {
                            {"201", "demo_staff_a", "COUNTER_STAFF"}, {"202", "demo_staff_b", "COUNTER_STAFF"},
                            {"203", "demo_staff_other", "COUNTER_STAFF"}, {"204", "demo_admin_a", "ADMIN"},
                            {"205", "demo_admin_b", "ADMIN"}}) {
                        insert.setLong(1, Long.parseLong(account[0])); insert.setString(2, account[1]);
                        insert.setString(3, encoder.encode("Public-synthetic-demo_1")); insert.setString(4, account[2]);
                        insert.executeUpdate();
                    }
                }
                statement.executeUpdate("UPDATE users SET staff_access_enabled=TRUE WHERE id IN (201,202,203)");
                statement.executeUpdate("INSERT INTO visitor_categories(id,code,name) VALUES(1,'EXECUTIVE','Executive'),(2,'PENJAGA','Penjaga'),(3,'VENDOR','Vendor'),(4,'CONTRACTOR','Contractor')");
                statement.executeUpdate("INSERT INTO destinations(id,code,name,destination_kind) VALUES(1,'DEMO_WARD','Synthetic Ward','WARD'),(2,'DEMO_OFFICE','Synthetic Office','OTHER')");
                // Mark the dedicated seed complete so no bootstrap account command can claim this demonstration database.
                statement.executeUpdate("UPDATE bootstrap_state SET completed=TRUE WHERE id=1");
                connection.commit();
            } catch (Exception failure) {
                connection.rollback(); throw failure;
            }
        }
        System.out.println("Demonstration reference/account seed completed");
    }
}
