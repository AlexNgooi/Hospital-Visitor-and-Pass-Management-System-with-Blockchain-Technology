package eduupm.hsaas.testing;

import java.io.IOException;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.sql.DriverManager;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

/** Owns one random native test schema and a loopback proxy; never controls the MySQL service. */
public final class LocalMysql implements BeforeAllCallback, AfterAllCallback, AutoCloseable {
    private final String schema = "hsaas_test_" + UUID.randomUUID().toString().replace("-", "");
    private final Set<Socket> sockets = ConcurrentHashMap.newKeySet();
    private final ExecutorService workers = Executors.newVirtualThreadPerTaskExecutor();
    private ServerSocket proxy;
    private int databasePort;
    private String password;
    private boolean created;
    private volatile boolean paused;
    private volatile boolean closed;

    /** Construction does not connect; disabled test classes may safely retain static extension fields. */
    public static LocalMysql create() { return new LocalMysql(); }
    @Override public void beforeAll(ExtensionContext context) { initialize(); }
    @Override public void afterAll(ExtensionContext context) throws Exception { close(); }

    /** Explicit opt-in and a fixed restricted account prevent accidental use of application credentials. */
    private synchronized void initialize() {
        if (created) return;
        if (closed || !"true".equals(System.getenv("HSAAS_LOCAL_MYSQL_TESTS")))
            throw new IllegalStateException("Native integration tests require explicit opt-in");
        password = System.getenv("HSAAS_TEST_DB_PASSWORD");
        if (password == null || password.isBlank()) throw new IllegalStateException("Set the dedicated test account password");
        String port = System.getenv().getOrDefault("HSAAS_TEST_DB_PORT", "3306");
        if (!port.matches("[0-9]{1,5}")) throw new IllegalStateException("Invalid test database port");
        databasePort = Integer.parseInt(port);
        if (databasePort < 1 || databasePort > 65535) throw new IllegalStateException("Invalid test database port");
        try {
            // A random, private schema is the only target that this helper can create or later drop.
            try (var connection = DriverManager.getConnection(controlUrl(), getUsername(), password);
                 var statement = connection.createStatement()) {
                statement.execute("CREATE DATABASE `" + schema + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
                created = true;
            }
            proxy = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
            workers.submit(this::acceptConnections);
        } catch (Exception failure) {
            try { close(); } catch (Exception cleanup) { failure.addSuppressed(cleanup); }
            throw new IllegalStateException("Dedicated native test schema setup failed", failure);
        }
    }

    /** Test-only URLs always name the generated schema and the proxy owned by this fixture. */
    public String getJdbcUrl() {
        initialize();
        return "jdbc:mysql://127.0.0.1:" + proxy.getLocalPort() + "/" + schema
                + "?connectionTimeZone=UTC&connectTimeout=3000&socketTimeout=3000";
    }
    public String getUsername() { return "hsaas_test_runner"; }
    public String getPassword() { initialize(); return password; }
    private String controlUrl() { return "jdbc:mysql://127.0.0.1:" + databasePort + "/?connectTimeout=3000&socketTimeout=3000"; }

    /** Outage tests sever only this fixture's database connections, leaving every other schema/service intact. */
    public void pauseConnections() {
        paused = true;
        sockets.forEach(LocalMysql::closeSocket);
    }
    public void resumeConnections() { paused = false; }

    private void acceptConnections() {
        while (!closed) {
            try {
                Socket incoming = proxy.accept(); sockets.add(incoming);
                if (paused || closed) { sockets.remove(incoming); closeSocket(incoming); continue; }
                workers.submit(() -> connect(incoming));
            } catch (IOException failure) { if (!closed) paused = true; }
        }
    }

    /** Each accepted connection is forwarded byte-for-byte; no protocol data or credentials are recorded. */
    private void connect(Socket incoming) {
        Socket upstream = new Socket(); sockets.add(upstream);
        try {
            upstream.connect(new java.net.InetSocketAddress("127.0.0.1", databasePort), 3000);
            if (paused || closed) { closeSocket(incoming); closeSocket(upstream); return; }
            workers.submit(() -> forward(incoming, upstream));
            forward(upstream, incoming);
        } catch (IOException failure) {
            closeSocket(incoming); closeSocket(upstream);
        } finally {
            sockets.remove(incoming); sockets.remove(upstream);
            closeSocket(incoming); closeSocket(upstream);
        }
    }
    private static void forward(Socket source, Socket target) {
        try { source.getInputStream().transferTo(target.getOutputStream()); }
        catch (IOException ignored) { /* A paused or closed fixture intentionally breaks both directions. */ }
        finally { closeSocket(source); closeSocket(target); }
    }
    private static void closeSocket(Socket socket) {
        try { socket.close(); } catch (IOException ignored) { /* Already closed is harmless. */ }
    }

    /** Cleanup can drop only the exact random schema successfully created by this object. */
    @Override public synchronized void close() throws Exception {
        if (closed) return;
        closed = true; paused = true;
        if (proxy != null) proxy.close();
        sockets.forEach(LocalMysql::closeSocket); workers.shutdownNow();
        if (created) {
            if (!schema.matches("hsaas_test_[0-9a-f]{32}")) throw new IllegalStateException("Invalid owned schema");
            try (var connection = DriverManager.getConnection(controlUrl(), getUsername(), password);
                 var statement = connection.createStatement()) {
                statement.execute("DROP DATABASE `" + schema + "`");
                created = false;
            }
        }
    }
}
