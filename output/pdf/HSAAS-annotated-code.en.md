# 00 Contract, scope and reading conventions

This is the English annotated-code companion, delivered as a PDF only. File listings are complete within the reference implementation: imports, configuration, SQL, UI, reader, Move, worker and tests are included rather than replacing application methods with TODOs. Copy each listing to its named file; line numbers printed in the margin are not part of the source. Multiple listings under one file heading are consecutive parts of that file unless explicitly stated otherwise.

The reference implements registration for four categories, a deterministic mock hospital check, account login and role enforcement, review/rejection, card inventory, scan jobs, atomic issue/return, overdue calculation, account administration, a configurable loan duration, summary reporting, immutable audit snapshots, durable blockchain delivery and independent proof checking. The interface is a compact working-reference design, not a claim to reproduce the linked Figma file or a complete hospital-approved form.

## Explicit implementation decisions

This edition chooses Spring Boot 3.5.16 and Java 21 to keep the familiar Jackson 2 and starter APIs internally consistent. It is a stable-version reference, not a claim that 3.5 is the newest Boot line. Do not replace only the parent with Boot 4 without adapting dependencies/imports. It uses Spring JDBC rather than the guideline's suggested JPA; SQL and transaction boundaries are deliberately visible for learning. Business mutations share a database gate row: safe and easy to reason about for a small FYP, but a throughput bottleneck to replace with ordered per-resource locks after measuring.

Because no reader/card model is confirmed, this edition explicitly uses UID-to-category inventory mapping. Admin selects category during enrollment; subsequent assignment checks use that stored category. It does not pretend to read category from UID or implement universal NDEF commands. The reader's FF CA command requires compatible PC/SC hardware. A MOCK_UID option is clearly labelled and must not be enabled with real data.

The hospital adapter is mock-only and accepts named synthetic fixtures. No real hospital URL is invented. The code must not be deployed for actual patient use without replacing that adapter, agreeing form/retention rules, adding perimeter rate limits and completing the release gates. The system manages passes, not physical door actuation.

## Verification status

The document is authored and layout-checked; executable code is a reference for you to assemble and test. No claim is made that Spring/MySQL integration, an actual USB reader, Move compilation, Testnet publication or cloud deployment has passed in your environment. Platform secrets and published object IDs are intentionally external. Dependency installation generates lockfiles; save them after successful installation. No accounts, paid resources or blockchain deployments have been created.

Annotations use [Sxx] security, [Dxx] database, [Bxx] business, [Uxx] UI, [Rxx] reader, [Mxx] Move and [Wxx] worker. Each chapter explains meaning, purpose, importance and a concrete test. 'Critical' means removing the invariant can corrupt state or bypass authorization; 'High' means a failure can mislead users or break recovery.

# 01 Files and assembly order

Create a new learning directory, not on top of an existing working application. The listings are the application source; generated dependencies, Maven binaries and lockfiles are not printed. Use installed Maven 3.9+ or generate a Maven wrapper through Initializr. Prefer Java 21 and Node 24.

```text
hsaas-reference/
  backend/
    pom.xml
    Dockerfile
    src/main/resources/application.yml
    src/main/resources/db/migration/V1__schema.sql
    src/main/java/edu/upm/hsaas/App.java
    src/main/java/edu/upm/hsaas/Security.java
    src/main/java/edu/upm/hsaas/Store.java
    src/main/java/edu/upm/hsaas/Api.java
    src/test/java/edu/upm/hsaas/RulesTest.java
  frontend/
    package.json, index.html, tsconfig.json, vite.config.ts
    src/main.tsx, src/App.tsx, src/api.ts, src/index.css
    src/components/ui/button.tsx
  reader-agent/
    pom.xml
    src/main/java/ReaderAgent.java
  sui-worker/
    package.json, worker.mjs, verify.mjs
  move/hsaas_audit/
    Move.toml
    sources/audit.move
    tests/audit_tests.move
  infra/compose.yaml
  .gitignore
```

Start MySQL, then Backend, then Frontend. Test registration and authentication before starting the mock reader. Replace mock reading with actual USB only after that succeeds. Publish Move and configure the worker last. The browser never receives a device token, database password or Sui private key.

## .gitignore

```gitignore
**/node_modules/
**/target/
**/dist/
**/build/
**/.env
**/.env.*
!**/.env.example
**/secrets/
**/logs/
**/*.sql.backup
```

# 02 Backend build and runtime configuration

## backend/pom.xml

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
 https://maven.apache.org/xsd/maven-4.0.0.xsd">
 <modelVersion>4.0.0</modelVersion>
 <parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.5.16</version><relativePath/>
 </parent>
 <groupId>edu.upm</groupId><artifactId>hsaas</artifactId>
 <version>1.0.0</version>
 <properties><java.version>21</java.version></properties>
 <dependencies>
  <dependency><groupId>org.springframework.boot</groupId>
   <artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
   <artifactId>spring-boot-starter-jdbc</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
   <artifactId>spring-boot-starter-security</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
   <artifactId>spring-boot-starter-actuator</artifactId></dependency>
  <dependency><groupId>org.flywaydb</groupId>
   <artifactId>flyway-core</artifactId></dependency>
  <dependency><groupId>org.flywaydb</groupId>
   <artifactId>flyway-mysql</artifactId></dependency>
  <dependency><groupId>com.mysql</groupId>
   <artifactId>mysql-connector-j</artifactId><scope>runtime</scope></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
   <artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
 </dependencies>
 <build><finalName>app</finalName><plugins><plugin>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-maven-plugin</artifactId>
 </plugin></plugins></build>
</project>
```

## backend/src/main/resources/application.yml

```yaml
server:
  port: ${PORT:8080}
  servlet:
    session:
      timeout: 30m
      cookie:
        http-only: true
        secure: ${COOKIE_SECURE:false}
        same-site: lax
        path: /
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 5
      connection-init-sql: "SET time_zone = '+00:00'"
  flyway:
    enabled: true
  jackson:
    deserialization:
      fail-on-unknown-properties: true
management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      show-details: never
```

Meaning: configuration enters through process environment, not source constants. Purpose: the same code can use isolated local/test databases. Importance: High; COOKIE_SECURE must be true behind public HTTPS. In-memory sessions deliberately expire on restart; add Spring Session JDBC before running multiple Backend instances.

# 03 Database schema and final constraints

## backend/src/main/resources/db/migration/V1__schema.sql

```sql
CREATE TABLE gate (id INT PRIMARY KEY);
INSERT INTO gate VALUES (1);

CREATE TABLE users (
 username VARCHAR(50) PRIMARY KEY,
 password_hash VARCHAR(100) NOT NULL,
 role VARCHAR(20) NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 CHECK (role IN ('ADMIN','COUNTER_STAFF'))
);
CREATE TABLE settings (
 id INT PRIMARY KEY, hours INT NOT NULL,
 CHECK (hours BETWEEN 1 AND 168)
);
INSERT INTO settings VALUES (1,8);

CREATE TABLE registrations (
 id CHAR(36) PRIMARY KEY,
 category VARCHAR(20) NOT NULL,
 data TEXT NOT NULL,
 state VARCHAR(12) NOT NULL DEFAULT 'SUBMITTED',
 reviewer VARCHAR(50), reason VARCHAR(300),
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CHECK (category IN ('EXECUTIVE','PENJAGA','VENDOR','CONTRACTOR')),
 CHECK (state IN ('SUBMITTED','VERIFIED','REJECTED')),
 INDEX ix_queue (state,created_at)
);
CREATE TABLE cards (
 uid VARCHAR(32) PRIMARY KEY,
 category VARCHAR(20) NOT NULL,
 state VARCHAR(12) NOT NULL DEFAULT 'AVAILABLE',
 CHECK (category IN ('EXECUTIVE','PENJAGA','VENDOR','CONTRACTOR')),
 CHECK (state IN ('AVAILABLE','ISSUED','DISABLED'))
);
CREATE TABLE assignments (
 id CHAR(36) PRIMARY KEY,
 registration_id CHAR(36) NOT NULL,
 uid VARCHAR(32) NOT NULL,
 issued_by VARCHAR(50) NOT NULL,
 issued_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 due_at TIMESTAMP(6) NOT NULL,
 returned_at TIMESTAMP(6) NULL,
 returned_by VARCHAR(50),
 active_uid VARCHAR(32) GENERATED ALWAYS AS
   (CASE WHEN returned_at IS NULL THEN uid ELSE NULL END) STORED,
 active_registration CHAR(36) GENERATED ALWAYS AS
   (CASE WHEN returned_at IS NULL THEN registration_id ELSE NULL END) STORED,
 UNIQUE KEY uq_active_card (active_uid),
 UNIQUE KEY uq_active_registration (active_registration),
 FOREIGN KEY (uid) REFERENCES cards(uid),
 FOREIGN KEY (registration_id) REFERENCES registrations(id),
 INDEX ix_due (returned_at,due_at)
);
CREATE TABLE scans (
 id CHAR(36) PRIMARY KEY,
 actor VARCHAR(50) NOT NULL,
 purpose VARCHAR(12) NOT NULL,
 target CHAR(36) NOT NULL DEFAULT '',
 state VARCHAR(12) NOT NULL DEFAULT 'WAITING',
 uid VARCHAR(32), lease_token CHAR(36),
 expires_at TIMESTAMP(6) NOT NULL,
 CHECK (purpose IN ('ENROLL','ISSUE')),
 CHECK (state IN ('WAITING','READING','READY','ERROR','CANCELLED','CONSUMED'))
);
CREATE TABLE commands (
 actor VARCHAR(100) NOT NULL,
 operation VARCHAR(50) NOT NULL,
 command_key CHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 response TEXT NOT NULL,
 PRIMARY KEY (actor,operation,command_key)
);
CREATE TABLE audit_events (
 id CHAR(36) PRIMARY KEY,
 event_type VARCHAR(40) NOT NULL,
 payload TEXT NOT NULL,
 hash CHAR(64) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
CREATE TABLE outbox (
 event_id CHAR(36) PRIMARY KEY,
 state VARCHAR(16) NOT NULL DEFAULT 'PENDING',
 tx_bytes MEDIUMTEXT, signature TEXT,
 digest VARCHAR(100), attempts INT NOT NULL DEFAULT 0,
 error_code VARCHAR(60),
 FOREIGN KEY (event_id) REFERENCES audit_events(id)
);
```

[D01] Critical: the two generated unique columns enforce one active card and one active registration at the database layer. They remain effective even if two callers pass an earlier application check. Test by directly attempting two open rows with the same UID.

[D02] Critical: commands, business rows, audit_events and outbox are committed together. A duplicate command returns its original response. The gate row serializes these short transactions, trading throughput for straightforward correctness. Do not hold it across NFC or Sui network waits.

The code derives OVERDUE from an open assignment's due_at rather than maintaining a second scheduler-owned card state. This avoids return/scheduler races and shows overdue immediately; there is no separate overdue-event anchor in this reference. Historical issue/return events remain available. Add an explicit overdue event only if the approved requirement needs it.

# 04 Application bootstrap and helper rules

## backend/src/main/java/edu/upm/hsaas/App.java

```java
package edu.upm.hsaas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class App {
 public static void main(String[] args) {
  SpringApplication.run(App.class, args);
 }
 @Bean CommandLineRunner bootstrap(JdbcTemplate db, PasswordEncoder encoder) {
  return args -> {
   String secret = System.getenv("BOOTSTRAP_PASSWORD");
   if (secret == null) return;
   if (secret.length() < 16) throw new IllegalStateException("Weak bootstrap");
   // [S01] No shared default password and no overwrite of existing accounts.
   db.update("""
    INSERT INTO users(username,password_hash,role)
    SELECT 'admin',?,'ADMIN' WHERE NOT EXISTS (SELECT 1 FROM users)
    """, encoder.encode(secret));
  };
 }
}
```

Run one instance for initial bootstrap; remove BOOTSTRAP_PASSWORD after creation. The initialization query is not a substitute for a multi-instance provisioning workflow. Login uses username admin and your own injected password.

[S01] Critical: no hard-coded default administrator credential is distributed. Losing the configured password requires an authorized reset, not an undocumented backdoor.

# 05 Security boundaries and session handling

## backend/src/main/java/edu/upm/hsaas/Security.java

```java
package edu.upm.hsaas;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class Security {
 @Bean PasswordEncoder encoder() { return new BCryptPasswordEncoder(12); }
 @Bean UserDetailsService accounts(JdbcTemplate db) {
  return name -> {
   var rows = db.queryForList("SELECT * FROM users WHERE username=?", name);
   if (rows.isEmpty()) throw new UsernameNotFoundException("Unknown account");
   var r = rows.getFirst();
   return User.withUsername(name).password((String) r.get("password_hash"))
    .roles((String) r.get("role"))
    .disabled(!Boolean.TRUE.equals(r.get("active"))).build();
  };
 }
 static void error(HttpServletResponse res, int status, String code)
 throws IOException {
  res.setStatus(status); res.setContentType("application/json");
  res.getWriter().write("{\"code\":\"" + code + "\"}");
 }
 @Bean @Order(1)
 SecurityFilterChain device(HttpSecurity http) throws Exception {
  String token = System.getenv("DEVICE_TOKEN");
  if (token == null || token.length() < 32)
   throw new IllegalStateException("DEVICE_TOKEN needs 32+ random characters");
  // [S02] CSRF exemption is limited to bearer-only device routes.
  http.securityMatcher("/api/device/**")
   .csrf(c -> c.disable())
   .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .authorizeHttpRequests(a -> a.anyRequest().hasRole("DEVICE"))
   .exceptionHandling(e -> e.authenticationEntryPoint(
    (req,res,ex) -> error(res,401,"DEVICE_AUTH")))
   .addFilterBefore(new OncePerRequestFilter() {
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
      FilterChain chain) throws IOException, ServletException {
     String value = req.getHeader("Authorization");
     byte[] actual = (value == null ? "" : value).getBytes(StandardCharsets.UTF_8);
     byte[] expected = ("Bearer " + token).getBytes(StandardCharsets.UTF_8);
     if (MessageDigest.isEqual(actual,expected)) {
      var user = User.withUsername("reader-1").password("").roles("DEVICE").build();
      var auth = new UsernamePasswordAuthenticationToken(user,null,user.getAuthorities());
      SecurityContextHolder.getContext().setAuthentication(auth);
     }
     chain.doFilter(req,res);
    }
   }, UsernamePasswordAuthenticationFilter.class);
  return http.build();
 }
 @Bean @Order(2)
 SecurityFilterChain browser(HttpSecurity http, UserDetailsService accounts)
 throws Exception {
  http.authorizeHttpRequests(a -> a
   .requestMatchers("/api/public/**","/api/auth/csrf","/actuator/health").permitAll()
   .requestMatchers("/api/admin/**").hasRole("ADMIN")
   .requestMatchers("/api/staff/**").hasAnyRole("ADMIN","COUNTER_STAFF")
   .anyRequest().authenticated())
   .formLogin(f -> f.loginProcessingUrl("/api/auth/login").permitAll()
    .successHandler((req,res,auth) -> {
     res.setContentType("application/json"); res.getWriter().write("{\"ok\":true}");
    }).failureHandler((req,res,ex) -> error(res,401,"LOGIN_FAILED")))
   .logout(l -> l.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID")
    .logoutSuccessHandler((req,res,auth) -> res.setStatus(204)))
   .exceptionHandling(e -> e
    .authenticationEntryPoint((req,res,ex) -> error(res,401,"LOGIN_REQUIRED"))
    .accessDeniedHandler((req,res,ex) -> error(res,403,"ACCESS_DENIED")))
   .addFilterBefore(new OncePerRequestFilter() {
    protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,
      FilterChain chain) throws IOException,ServletException {
     // [S03] Reload current role/active state for existing sessions.
     var auth = SecurityContextHolder.getContext().getAuthentication();
     if (auth != null && auth.isAuthenticated()) {
      try {
       var fresh = accounts.loadUserByUsername(auth.getName());
       if (!fresh.isEnabled()) throw new UsernameNotFoundException("Disabled");
       SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(fresh,null,fresh.getAuthorities()));
      } catch (UsernameNotFoundException ex) {
       SecurityContextHolder.clearContext();
       var session = req.getSession(false);
       if (session != null) session.invalidate();
       error(res,401,"SESSION_REVOKED"); return;
      }
     }
     res.setHeader("Cache-Control","no-store");
     chain.doFilter(req,res);
    }
   }, UsernamePasswordAuthenticationFilter.class);
  return http.build();
 }
}
```

[S02] Critical: a device token can only access the device API, not enroll cards or issue passes as a human. The reference has one configured counter reader. Multi-counter deployment requires per-device records, revocation and job/device binding; do not duplicate this token across a hospital.

[S03] High: a disabled or demoted account must not retain old privileges through a cached session. Password reset is not included in account editing; handle resets by a separate reviewed workflow that invalidates sessions. CSRF remains enabled for browser writes, including anonymous registration and login.

Tests: wrong device token yields 401; missing CSRF yields 403; staff cannot call admin endpoints; disabling a user ends their ability to make requests. Rate-limit login and anonymous endpoints at the reverse proxy before any public deployment.

# 06 Store: atomic commands and audit snapshots

## backend/src/main/java/edu/upm/hsaas/Store.java

This file continues through chapters 07-09. Concatenate the four Java listings in order; there is one package declaration, one class and one closing class brace at the end of chapter 09.

```java
package edu.upm.hsaas;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class Store {
 final JdbcTemplate db;
 final TransactionTemplate tx;
 final ObjectMapper json;
 final PasswordEncoder passwords;
 public Store(JdbcTemplate db,TransactionTemplate tx,ObjectMapper json,
   PasswordEncoder passwords) {
  this.db=db; this.tx=tx; this.json=json; this.passwords=passwords;
 }
 static final Set<String> CATEGORIES = Set.of(
  "EXECUTIVE","PENJAGA","VENDOR","CONTRACTOR");
 static String id() { return UUID.randomUUID().toString(); }
 static void require(boolean ok,String code) {
  if (!ok) throw new ResponseStatusException(HttpStatus.CONFLICT,code);
 }
 static String value(Map<String,String> m,String key,int max) {
  String s=m.getOrDefault(key,"").trim();
  require(!s.isEmpty() && s.length()<=max,"INVALID_"+key.toUpperCase());
  return s;
 }
 static String uid(String raw) {
  String u=raw.replace(" ","").replace(":","").toUpperCase(Locale.ROOT);
  require(u.matches("(?:[0-9A-F]{2}){4,10}"),"INVALID_UID"); return u;
 }
 static String sha(String s) {
  try {
   return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
    .digest(s.getBytes(StandardCharsets.UTF_8)));
  } catch (Exception e) { throw new IllegalStateException(e); }
 }
 String encode(Object x) {
  try { return json.writeValueAsString(x); }
  catch (Exception e) { throw new IllegalStateException(e); }
 }
 Map<String,Object> decode(String s) {
  try { return json.readValue(s,new TypeReference<Map<String,Object>>() {}); }
  catch (Exception e) { throw new IllegalStateException(e); }
 }
 Map<String,Object> one(String sql,Object... args) {
  var rows=db.queryForList(sql,args);
  require(rows.size()==1,"NOT_FOUND"); return rows.getFirst();
 }
 public Map<String,Object> command(String actor,String op,String key,
   Map<String,String> body,Supplier<Map<String,Object>> action) {
  require(key != null && key.matches("[0-9a-fA-F-]{36}"),"INVALID_COMMAND_KEY");
  require(body.size()<=20,"TOO_MANY_FIELDS");
  body.values().forEach(v -> require(v!=null && v.length()<=1000,"INPUT_TOO_LONG"));
  String hash=sha(encode(new TreeMap<>(body)));
  return tx.execute(status -> {
   // [D03] One short DB transaction; no external network calls inside it.
   db.queryForObject("SELECT id FROM gate WHERE id=1 FOR UPDATE",Integer.class);
   var old=db.queryForList("""
    SELECT request_hash,response FROM commands
    WHERE actor=? AND operation=? AND command_key=?
    """,actor,op,key);
   if (!old.isEmpty()) {
    require(hash.equals(old.getFirst().get("request_hash")),"KEY_REUSED");
    return decode((String)old.getFirst().get("response"));
   }
   var result=action.get();
   db.update("INSERT INTO commands VALUES (?,?,?,?,?)",
    actor,op,key,hash,encode(result));
   return result;
  });
 }
 void audit(String type,String resource,String actor) {
  String eventId=id();
  // [D04] Snapshot format v1: explicit keys, UTC text, random nonce.
  var payload=new TreeMap<String,Object>();
  payload.put("version",1); payload.put("eventId",eventId);
  payload.put("type",type); payload.put("resource",resource);
  payload.put("actor",actor); payload.put("time",Instant.now().toString());
  payload.put("nonce",id());
  String bytes=encode(payload);
  db.update("INSERT INTO audit_events(id,event_type,payload,hash) VALUES (?,?,?,?)",
   eventId,type,bytes,sha(bytes));
  db.update("INSERT INTO outbox(event_id) VALUES (?)",eventId);
 }
 public String hospital(Map<String,String> b) {
  String mrn=value(b,"mrn",40),ward=value(b,"ward",40);
  if (mrn.equals("DEMO-TIMEOUT")) return "UNAVAILABLE";
  return mrn.equals("DEMO-0001") && ward.equals("WARD-A") ? "VALID" : "INVALID";
 }
 public Map<String,Object> register(Map<String,String> b) {
  String category=value(b,"category",20);
  require(CATEGORIES.contains(category),"CATEGORY_UNKNOWN");
  var clean=new TreeMap<String,String>();
  clean.put("name",value(b,"name",120)); clean.put("phone",value(b,"phone",32));
  clean.put("destination",value(b,"destination",80));
  clean.put("purpose",value(b,"purpose",200));
  require("yes".equals(b.get("consent")),"NOTICE_REQUIRED");
  if (category.equals("PENJAGA")) {
   // [B01] Validate again on final submit, never trust a browser checkmark.
   String result=hospital(b); require(result.equals("VALID"),"MRN_"+result);
   clean.put("mrn",value(b,"mrn",40)); clean.put("ward",value(b,"ward",40));
   clean.put("mrnSource","MOCK");
  } else if (category.equals("VENDOR") || category.equals("CONTRACTOR")) {
   clean.put("organization",value(b,"organization",120));
  }
  String reference=id();
  db.update("INSERT INTO registrations(id,category,data) VALUES (?,?,?)",
   reference,category,encode(clean));
  audit("REGISTERED",reference,"PUBLIC");
  return Map.of("reference",reference,"state","SUBMITTED","hospitalMode","MOCK");
 }
 public Map<String,Object> review(String reg,Map<String,String> b,String actor) {
  var row=one("SELECT * FROM registrations WHERE id=?",reg);
  require("SUBMITTED".equals(row.get("state")),"ALREADY_REVIEWED");
  String decision=value(b,"decision",12);
  require(Set.of("VERIFIED","REJECTED").contains(decision),"BAD_DECISION");
  String reason=decision.equals("REJECTED") ? value(b,"reason",300) : "";
  db.update("UPDATE registrations SET state=?,reviewer=?,reason=? WHERE id=?",
   decision,actor,reason,reg); audit(decision,reg,actor);
  return Map.of("id",reg,"state",decision);
 }
```

[D03] Critical: command hashing and response persistence make retried mutations deterministic. The gate makes the existence check safe across instances using the same database. Anonymous commands are scoped by browser session rather than a caller-supplied actor.

[D04] High: this v1 snapshot proves the specified event metadata, not every visitor field. No raw UID or MRN is published to Sui; even eventId is random. Exact serialized bytes are retained so verification does not depend on later serializer changes. Expand the versioned snapshot deliberately if form-field integrity must also be proven.

[B01] Critical: mock validation is repeated during submission. When substituting a real network API, perform remote validation before entering command(), persist bound short-lived evidence and recheck that evidence inside the transaction. Do not add hospital network waits under the global database lock.

# 07 Store: scan job lifecycle

## Store.java, continuation

```java
 public Map<String,Object> startScan(Map<String,String> b,String actor,boolean admin) {
  String purpose=value(b,"purpose",12);
  require(Set.of("ENROLL","ISSUE").contains(purpose),"BAD_SCAN_PURPOSE");
  require(!purpose.equals("ENROLL") || admin,"ADMIN_REQUIRED");
  String target=purpose.equals("ISSUE") ? value(b,"target",36) : "";
  if (purpose.equals("ISSUE")) {
   var r=one("SELECT state FROM registrations WHERE id=?",target);
   require("VERIFIED".equals(r.get("state")),"NOT_VERIFIED");
  }
  db.update("""
   UPDATE scans SET state='ERROR'
   WHERE state IN ('WAITING','READING','READY') AND expires_at<CURRENT_TIMESTAMP
   """);
  Integer active=db.queryForObject("""
   SELECT COUNT(*) FROM scans WHERE state IN ('WAITING','READING','READY')
   """,Integer.class);
  require(active==0,"READER_BUSY");
  String job=id();
  db.update("""
   INSERT INTO scans(id,actor,purpose,target,expires_at)
   VALUES (?,?,?,?,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 90 SECOND))
   """,job,actor,purpose,target);
  return Map.of("id",job,"state","WAITING");
 }
 public Map<String,Object> scan(String id,String actor) {
  var row=one("SELECT * FROM scans WHERE id=? AND actor=?",id,actor);
  if (((Timestamp)row.get("expires_at")).toInstant().isBefore(Instant.now())
    && !Set.of("CONSUMED","CANCELLED").contains(row.get("state"))) {
   row.put("state","ERROR");
  }
  row.remove("lease_token"); return row;
 }
 public Map<String,Object> cancel(String id,String actor) {
  db.update("""
   UPDATE scans SET state='CANCELLED'
   WHERE id=? AND actor=? AND state IN ('WAITING','READING','READY')
   """,id,actor);
  return Map.of("ok",true);
 }
 public Map<String,Object> claim() {
  var rows=db.queryForList("""
   SELECT id FROM scans WHERE state='WAITING'
   AND expires_at>CURRENT_TIMESTAMP ORDER BY expires_at LIMIT 1
   """);
  if (rows.isEmpty()) return Map.of("state","IDLE");
  String job=(String)rows.getFirst().get("id"),lease=id();
  db.update("UPDATE scans SET state='READING',lease_token=? WHERE id=?",lease,job);
  return Map.of("state","READING","id",job,"lease",lease);
 }
 public Map<String,Object> result(String job,Map<String,String> b) {
  var row=one("SELECT * FROM scans WHERE id=?",job);
  require("READING".equals(row.get("state")),"SCAN_NOT_READING");
  require(value(b,"lease",36).equals(row.get("lease_token")),"SCAN_LEASE");
  require(((Timestamp)row.get("expires_at")).toInstant().isAfter(Instant.now()),
   "SCAN_EXPIRED");
  boolean ok="READY".equals(b.get("state"));
  String u=ok ? uid(value(b,"uid",32)) : null;
  db.update("UPDATE scans SET state=?,uid=? WHERE id=?",ok?"READY":"ERROR",u,job);
  return Map.of("ok",true);
 }
 Map<String,Object> usable(Map<String,String> b,String actor,String purpose,String target) {
  var row=one("SELECT * FROM scans WHERE id=?",value(b,"scanId",36));
  // [R01] Evidence belongs to this actor, purpose, target and unexpired job.
  require(actor.equals(row.get("actor")) && purpose.equals(row.get("purpose"))
   && target.equals(row.get("target")),"SCAN_CONTEXT");
  require("READY".equals(row.get("state")),"SCAN_NOT_READY");
  require(((Timestamp)row.get("expires_at")).toInstant().isAfter(Instant.now()),
   "SCAN_EXPIRED");
  return row;
 }
 void consume(Map<String,Object> scan) {
  db.update("UPDATE scans SET state='CONSUMED' WHERE id=?",scan.get("id"));
 }
```

[R01] Critical: a valid-looking UID alone is not enough. Backend accepts the result only in the initiating operation's context, then consumes it atomically. Failed/cancelled/expired jobs cannot be reused. Test submitting an old scan, another staff member's scan and an enrollment scan to the issue endpoint.

The one-reader implementation lets an expired READING job fail rather than assigning it to another agent. Staff explicitly retries with a new job. That is an intentional safe recovery choice; do not silently reuse a lease after a crash. Job polling does not extend the 90-second expiry.

# 08 Store: enroll, issue and return

## Store.java, continuation

```java
 public Map<String,Object> enroll(Map<String,String> b,String actor) {
  var scan=usable(b,actor,"ENROLL","");
  String category=value(b,"category",20),u=(String)scan.get("uid");
  require(CATEGORIES.contains(category),"CATEGORY_UNKNOWN");
  require(db.queryForList("SELECT uid FROM cards WHERE uid=?",u).isEmpty(),
   "DUPLICATE_CARD");
  db.update("INSERT INTO cards(uid,category) VALUES (?,?)",u,category);
  consume(scan); audit("CARD_ENROLLED",sha(u),actor);
  return Map.of("uid",u,"state","AVAILABLE");
 }
 public Map<String,Object> issue(Map<String,String> b,String actor) {
  String reg=value(b,"registrationId",36);
  var r=one("SELECT * FROM registrations WHERE id=?",reg);
  require("VERIFIED".equals(r.get("state")),"NOT_VERIFIED");
  var scan=usable(b,actor,"ISSUE",reg);
  String u=(String)scan.get("uid");
  var cards=db.queryForList("SELECT * FROM cards WHERE uid=?",u);
  require(!cards.isEmpty(),"CARD_UNREGISTERED");
  var card=cards.getFirst();
  // [B02] The database, not the client, supplies authoritative card state.
  require("AVAILABLE".equals(card.get("state")),"CARD_UNAVAILABLE");
  require(r.get("category").equals(card.get("category")),"CATEGORY_MISMATCH");
  require(db.queryForList("""
   SELECT id FROM assignments WHERE registration_id=? AND returned_at IS NULL
   """,reg).isEmpty(),"ALREADY_ASSIGNED");
  String assignment=id();
  Integer hours=db.queryForObject("SELECT hours FROM settings WHERE id=1",Integer.class);
  db.update("""
   INSERT INTO assignments(id,registration_id,uid,issued_by,due_at)
   VALUES (?,?,?,?,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL ? HOUR))
   """,assignment,reg,u,actor,hours);
  db.update("UPDATE cards SET state='ISSUED' WHERE uid=?",u);
  consume(scan); audit("ISSUED",assignment,actor);
  return Map.of("id",assignment,"uid",u,"proof","PENDING");
 }
 public Map<String,Object> returned(String assignment,String actor) {
  var a=one("SELECT * FROM assignments WHERE id=?",assignment);
  if (a.get("returned_at")!=null) return Map.of("id",assignment,"state","RETURNED");
  db.update("""
   UPDATE assignments SET returned_at=CURRENT_TIMESTAMP,returned_by=? WHERE id=?
   """,actor,assignment);
  db.update("UPDATE cards SET state='AVAILABLE' WHERE uid=?",a.get("uid"));
  audit("RETURNED",assignment,actor);
  return Map.of("id",assignment,"state","RETURNED");
 }
 public Map<String,Object> cardState(String raw,Map<String,String> b,String actor) {
  String u=uid(raw),next=value(b,"state",12);
  var c=one("SELECT state FROM cards WHERE uid=?",u);
  require(!"ISSUED".equals(c.get("state")),"CARD_IN_USE");
  require(Set.of("AVAILABLE","DISABLED").contains(next),"BAD_CARD_STATE");
  db.update("UPDATE cards SET state=? WHERE uid=?",next,u);
  audit("CARD_"+next,sha(u),actor); return Map.of("ok",true);
 }
```

[B02] Critical: UI compatibility checks are only feedback. Server-side state/category checks prevent assignment using forged JSON or stale screens. The unique constraints are an additional defense. Enrollment never silently overwrites an existing category.

Return is an authenticated staff action selected from an assignment record and confirmed in the UI; it does not fabricate a successful NFC scan. If policy requires mandatory scan-on-return, add RETURN scan context and enforce it before accepting that command. The reference's original assignment flow still requires a real or explicitly simulated scan.

Test same-card concurrent issue, same-registration concurrent issue, duplicate enrollment, mismatched category, repeated return and injected audit-write failure. Observe final row counts, not only UI messages.

# 09 Store: administration, queries and proof data

## Store.java, final continuation

```java
 public Map<String,Object> user(Map<String,String> b,String actor) {
  String name=value(b,"username",50),role=value(b,"role",20);
  require(name.matches("[a-zA-Z0-9._-]{3,50}"),"BAD_USERNAME");
  require(Set.of("ADMIN","COUNTER_STAFF").contains(role),"BAD_ROLE");
  boolean active="true".equals(b.get("active"));
  var old=db.queryForList("SELECT * FROM users WHERE username=?",name);
  if (old.isEmpty()) {
   String password=value(b,"password",72);
   require(password.length()>=16 && password.getBytes(StandardCharsets.UTF_8).length<=72,
    "PASSWORD_LENGTH");
   db.update("INSERT INTO users VALUES (?,?,?,?)",name,passwords.encode(password),role,active);
  } else {
   var u=old.getFirst();
   boolean wasAdmin="ADMIN".equals(u.get("role")) && Boolean.TRUE.equals(u.get("active"));
   if (wasAdmin && (!active || !role.equals("ADMIN"))) {
    int count=db.queryForObject("""
     SELECT COUNT(*) FROM users WHERE role='ADMIN' AND active=TRUE
     """,Integer.class);
    require(count>1,"LAST_ADMIN");
   }
   require(b.getOrDefault("password","").isEmpty(),"RESET_NOT_SUPPORTED_HERE");
   db.update("UPDATE users SET role=?,active=? WHERE username=?",role,active,name);
  }
  audit("USER_CHANGED",name,actor); return Map.of("ok",true);
 }
 public Map<String,Object> settings(Map<String,String> b,String actor) {
  int hours;
  try { hours=Integer.parseInt(value(b,"hours",3)); }
  catch (NumberFormatException e) { throw new ResponseStatusException(
    HttpStatus.BAD_REQUEST,"INVALID_HOURS"); }
  require(hours>=1 && hours<=168,"INVALID_HOURS");
  db.update("UPDATE settings SET hours=? WHERE id=1",hours);
  audit("SETTINGS_CHANGED",Integer.toString(hours),actor); return Map.of("hours",hours);
 }
 public List<Map<String,Object>> registrations(int page) {
  require(page>=0 && page<=10000,"INVALID_PAGE");
  return db.queryForList("""
   SELECT id,category,state,created_at FROM registrations
   ORDER BY created_at DESC,id LIMIT 20 OFFSET ?
   """,page*20);
 }
 public Map<String,Object> detail(String id) {
  var r=one("SELECT * FROM registrations WHERE id=?",id);
  r.put("data",decode((String)r.get("data"))); return r;
 }
 public List<Map<String,Object>> assignments(int page) {
  require(page>=0 && page<=10000,"INVALID_PAGE");
  return db.queryForList("""
   SELECT id,registration_id,uid,issued_at,due_at,returned_at,
    CASE WHEN returned_at IS NOT NULL THEN 'RETURNED'
     WHEN due_at<CURRENT_TIMESTAMP THEN 'OVERDUE' ELSE 'ISSUED' END AS state
   FROM assignments ORDER BY issued_at DESC,id LIMIT 20 OFFSET ?
   """,page*20);
 }
 public Map<String,Object> summary() {
  return Map.of("registrations",db.queryForList("""
    SELECT category,COUNT(*) AS total FROM registrations GROUP BY category
   """),"queue",db.queryForObject(
    "SELECT COUNT(*) FROM registrations WHERE state='SUBMITTED'",Long.class),
   "active",db.queryForObject(
    "SELECT COUNT(*) FROM assignments WHERE returned_at IS NULL",Long.class),
   "overdue",db.queryForObject("""
    SELECT COUNT(*) FROM assignments
    WHERE returned_at IS NULL AND due_at<CURRENT_TIMESTAMP
   """,Long.class));
 }
 public List<Map<String,Object>> proofs(int page) {
  require(page>=0 && page<=10000,"INVALID_PAGE");
  return db.queryForList("""
   SELECT a.id,a.event_type,a.hash,a.created_at,o.state,o.digest,o.error_code
   FROM audit_events a JOIN outbox o ON a.id=o.event_id
   ORDER BY a.created_at DESC,a.id LIMIT 20 OFFSET ?
   """,page*20);
 }
 public Map<String,Object> proof(String event) {
  var a=one("SELECT * FROM audit_events WHERE id=?",event);
  a.put("localIntegrity",sha((String)a.get("payload")).equals(a.get("hash")));
  return a;
 }
}
```

Account editing protects the last active administrator and never returns hashes in list endpoints. Reports intentionally use current operational counts and category totals, not an invented historical attendance metric. Personal registration details are returned only by the staff detail route, not public references or queue rows.

The proof endpoint checks local snapshot consistency only. It must not label an event 'verified on-chain'; chapter 19's independent verifier checks the transaction event and expected registry/package.

# 10 HTTP endpoints and safe errors

## backend/src/main/java/edu/upm/hsaas/Api.java

```java
package edu.upm.hsaas;

import jakarta.servlet.http.HttpSession;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class Api {
 final Store s;
 public Api(Store s) { this.s=s; }
 boolean admin(Authentication a) {
  return a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_ADMIN"));
 }
 Map<String,Object> run(Authentication a,String op,String key,
  Map<String,String> b,Supplier<Map<String,Object>> action) {
  return s.command(a.getName(),op,key,b,action);
 }
 @GetMapping("/api/auth/csrf") Object csrf(CsrfToken t) {
  return Map.of("token",t.getToken(),"headerName",t.getHeaderName());
 }
 @GetMapping("/api/auth/me") Object me(Authentication a) {
  return Map.of("username",a.getName(),"admin",admin(a));
 }
 @GetMapping("/api/public/config") Object config() {
  return Map.of("categories",Store.CATEGORIES,"hospitalMode","MOCK",
   "categorySource","INVENTORY_MAPPING","readerMode",System.getenv()
     .getOrDefault("READER_LABEL","PCSC / verify device configuration"));
 }
 @PostMapping("/api/public/mrn") Object mrn(@RequestBody Map<String,String> b) {
  return Map.of("result",s.hospital(b),"mode","MOCK");
 }
 @PostMapping("/api/public/registrations") Object register(
  @RequestBody Map<String,String> b,@RequestHeader("Idempotency-Key") String key,
  HttpSession session) {
  return s.command("public:"+session.getId(),"register",key,b,() -> s.register(b));
 }
 @GetMapping("/api/staff/registrations") Object registrations(
  @RequestParam(defaultValue="0") int page) { return s.registrations(page); }
 @GetMapping("/api/staff/registrations/{id}") Object detail(@PathVariable String id) {
  return s.detail(id);
 }
 @PostMapping("/api/staff/registrations/{id}/review") Object review(
  @PathVariable String id,@RequestBody Map<String,String> b,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"review:"+id,key,b,() -> s.review(id,b,a.getName()));
 }
 @PostMapping("/api/staff/scans") Object start(@RequestBody Map<String,String> b,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"scan",key,b,() -> s.startScan(b,a.getName(),admin(a)));
 }
 @GetMapping("/api/staff/scans/{id}") Object scan(@PathVariable String id,
  Authentication a) { return s.scan(id,a.getName()); }
 @PostMapping("/api/staff/scans/{id}/cancel") Object cancel(@PathVariable String id,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"cancel:"+id,key,Map.of(),() -> s.cancel(id,a.getName()));
 }
 @PostMapping("/api/admin/cards") Object enroll(@RequestBody Map<String,String> b,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"enroll",key,b,() -> s.enroll(b,a.getName()));
 }
 @PostMapping("/api/staff/assignments") Object issue(@RequestBody Map<String,String> b,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"issue",key,b,() -> s.issue(b,a.getName()));
 }
 @GetMapping("/api/staff/assignments") Object assignments(
  @RequestParam(defaultValue="0") int page) { return s.assignments(page); }
 @PostMapping("/api/staff/assignments/{id}/return") Object returned(
  @PathVariable String id,@RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"return:"+id,key,Map.of(),() -> s.returned(id,a.getName()));
 }
 @GetMapping("/api/admin/cards") Object cards() {
  return s.db.queryForList("SELECT * FROM cards ORDER BY uid LIMIT 500");
 }
 @PostMapping("/api/admin/cards/{uid}/state") Object cardState(
  @PathVariable String uid,@RequestBody Map<String,String> b,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"card:"+uid,key,b,() -> s.cardState(uid,b,a.getName()));
 }
 @GetMapping("/api/admin/users") Object users() {
  return s.db.queryForList("SELECT username,role,active FROM users ORDER BY username");
 }
 @PostMapping("/api/admin/users") Object user(@RequestBody Map<String,String> b,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"user",key,b,() -> s.user(b,a.getName()));
 }
 @GetMapping("/api/admin/settings") Object settings() {
  return s.one("SELECT hours FROM settings WHERE id=1");
 }
 @PostMapping("/api/admin/settings") Object settings(@RequestBody Map<String,String> b,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"settings",key,b,() -> s.settings(b,a.getName()));
 }
 @GetMapping("/api/staff/summary") Object summary() { return s.summary(); }
 @GetMapping("/api/admin/proofs") Object proofs(@RequestParam(defaultValue="0") int page) {
  return s.proofs(page);
 }
 @GetMapping("/api/admin/proofs/{id}") Object proof(@PathVariable String id) {
  return s.proof(id);
 }
 @PostMapping("/api/device/claim") Object claim(
  @RequestHeader("Idempotency-Key") String key) {
  return s.command("reader-1","claim",key,Map.of(),s::claim);
 }
 @PostMapping("/api/device/result/{id}") Object result(@PathVariable String id,
  @RequestBody Map<String,String> b,@RequestHeader("Idempotency-Key") String key) {
  return s.command("reader-1","result:"+id,key,b,() -> s.result(id,b));
 }
 @ExceptionHandler(ResponseStatusException.class)
 ResponseEntity<?> rule(ResponseStatusException e) {
  return ResponseEntity.status(e.getStatusCode()).body(Map.of(
   "code",Objects.requireNonNullElse(e.getReason(),"REQUEST_FAILED"),
   "correlationId",Store.id()));
 }
 @ExceptionHandler(DataIntegrityViolationException.class)
 ResponseEntity<?> conflict(DataIntegrityViolationException e) {
  return ResponseEntity.status(409).body(Map.of("code","DATA_CONFLICT"));
 }
 @ExceptionHandler(Exception.class)
 ResponseEntity<?> unexpected(Exception e) {
  String correlation=Store.id();
  org.slf4j.LoggerFactory.getLogger(Api.class).error("Request {} failed: {}",
   correlation,e.getClass().getSimpleName());
  return ResponseEntity.status(500).body(Map.of("code","INTERNAL_ERROR",
   "correlationId",correlation));
 }
}
```

Meaning: the controller supplies trusted actor identity and stable operation names to the transaction service. Purpose: no client actorId can impersonate a staff member. Importance: Critical. Parameterized SQL protects values; all dynamically selected table names are absent here.

Reference limits are explicit: inventory returns at most 500 rows; queue, assignments and proofs have pages of 20. Add cursor/search endpoints before exceeding that inventory scale. The public configuration accepts free-text destinations rather than claiming a hospital directory is already integrated.

# 11 Frontend build files and request client

## frontend/package.json

```json
{
 "name":"hsaas-reference-ui", "private":true, "version":"1.0.0",
 "type":"module",
 "scripts":{"dev":"vite","build":"tsc --noEmit && vite build","preview":"vite preview"},
 "dependencies":{"react":"19.1.1","react-dom":"19.1.1","qrcode.react":"4.2.0"},
 "devDependencies":{"@types/react":"19.1.13","@types/react-dom":"19.1.9",
  "@vitejs/plugin-react":"5.0.3","typescript":"5.9.2","vite":"7.1.5"}
}
```

## frontend/tsconfig.json

```json
{
 "compilerOptions":{
  "target":"ES2022","lib":["ES2022","DOM","DOM.Iterable"],
  "module":"ESNext","moduleResolution":"Bundler","jsx":"react-jsx",
  "strict":true,"skipLibCheck":true,"esModuleInterop":true,"noEmit":true
 },
 "include":["src"]
}
```

## frontend/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 plugins:[react()],
 server:{proxy:{'/api':{target:'http://localhost:8080',changeOrigin:true}}}
});
```

## frontend/index.html

```html
<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>HSAAS Visitor and Pass Management</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

## frontend/src/api.ts

```typescript
let csrf:{headerName:string;token:string}|null=null;
const pending=new Map<string,string>();
export async function token() {
 const r=await fetch('/api/auth/csrf',{credentials:'include',cache:'no-store'});
 if (!r.ok) throw new Error('CSRF_UNAVAILABLE');
 csrf=await r.json(); return csrf!;
}
export async function api(path:string,body?:Record<string,string>) {
 const headers:Record<string,string>={};
 const signature=path+JSON.stringify(body);
 if (body) {
  const t=csrf ?? await token(); headers[t.headerName]=t.token;
  headers['Content-Type']='application/json';
  // [U01] A transport retry keeps the original command key.
  if (!pending.has(signature)) pending.set(signature,crypto.randomUUID());
  headers['Idempotency-Key']=pending.get(signature)!;
 }
 const r=await fetch('/api'+path,{method:body?'POST':'GET',headers,
  credentials:'include',cache:'no-store',body:body?JSON.stringify(body):undefined});
 const data=r.status===204 ? {} : await r.json();
 if (!r.ok) {
  if (r.status===403) csrf=null;
  if (r.status===401) window.dispatchEvent(new Event('session-expired'));
  // A received rejection may be retried as a new command after correction.
  pending.delete(signature); throw new Error(data.code ?? `HTTP_${r.status}`);
 }
 pending.delete(signature); return data;
}
export async function login(username:string,password:string) {
 const t=await token();
 const r=await fetch('/api/auth/login',{method:'POST',credentials:'include',
  headers:{[t.headerName]:t.token},body:new URLSearchParams({username,password})});
 if (!r.ok) throw new Error('LOGIN_FAILED');
 await token(); return api('/auth/me');
}
export async function logout() {
 await api('/auth/logout',{}); csrf=null; pending.clear(); await token();
}
```

[U01] Critical: fetch resolving does not mean success. This helper checks HTTP status and keeps the idempotency key only when the outcome is unknown because transport failed. It stores no patient drafts or tokens in localStorage. A full reload loses the in-memory pending key; the teaching UI warns against reloading during an unknown submission. A production recovery flow should provide authenticated or session-bound result lookup.

# 12 Shared controls and square design tokens

The small Button below is project-owned, shadcn-style semantic composition, not a copied paid component or the complete shadcn distribution. It keeps the reference self-contained. To use actual shadcn/ui generated components, follow the English guide's installation chapter and replace this primitive while retaining its props and accessibility behavior. The application itself does not depend on the CLI.

## frontend/src/components/ui/button.tsx

```tsx
import type { ButtonHTMLAttributes } from 'react';
export function Button({className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>) {
 return <button className={'button '+className} {...props}/>;
}
```

## frontend/src/main.tsx

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
createRoot(document.getElementById('root')!).render(<App/>);
```

## frontend/src/index.css

```css
:root{font-family:Arial,sans-serif;color:#20252b;background:#fafafa;
 --primary:#9d0b0f;--line:#dce0e4;--radius:0}
*{box-sizing:border-box}body{margin:0}a{color:var(--primary)}
header{background:white;border-bottom:3px solid var(--primary);padding:20px 28px;
 display:flex;align-items:center;justify-content:space-between;gap:16px}
header strong{font-size:22px}header small{display:block;color:#65717e;margin-top:5px}
main{max-width:1250px;margin:0 auto;padding:24px}.public{max-width:640px}
nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:24px}
.button{border:1px solid var(--line);border-radius:0;min-height:44px;
 padding:10px 15px;background:white;color:#20252b;font:inherit;cursor:pointer}
.button.primary,.button[aria-pressed=true]{background:var(--primary);color:white;
 border-color:var(--primary)}.button:disabled{opacity:.5;cursor:not-allowed}
.button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{
 outline:3px solid #1d4ed8;outline-offset:3px}
form{display:grid;gap:16px}label{font-weight:bold;display:grid;gap:7px}
input,select{font:inherit;border:1px solid #abb3bb;border-radius:0;padding:11px;
 min-height:44px;width:100%;background:white;color:#20252b}
input[type=checkbox]{width:22px;min-height:22px}.check{display:flex;align-items:center}
section{background:white;border:1px solid var(--line);padding:24px;margin:18px 0}
h1{font-size:27px;margin:0 0 10px}h2{font-size:19px}p{line-height:1.55}
.notice{padding:14px;border-left:4px solid var(--primary);background:#fff0f0}
.status{padding:12px;background:#edf4ff;border-left:4px solid #2563eb;white-space:pre-wrap}
.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}
th,td{padding:12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
th{background:#f4f5f6}td{max-width:270px;overflow-wrap:anywhere}
.actions{display:flex;gap:7px;flex-wrap:wrap}.muted{color:#65717e;font-size:14px}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f5f6;padding:16px}
dl{display:grid;grid-template-columns:140px 1fr;gap:10px}dt{font-weight:bold}
dd{margin:0;overflow-wrap:anywhere}.scan{border:2px solid var(--primary)}
@media(max-width:650px){header{padding:16px;align-items:flex-start}main{padding:16px}
 section{padding:16px}nav .button{flex:1}dl{grid-template-columns:1fr}}
@media print{nav,.actions,header button{display:none}}
```

Importance: High. Square containers and restrained red actions honor the latest design direction. Labels, visible focus, live status and responsive overflow matter more than visual decoration. Test keyboard-only operation and mobile form completion; native alert/confirm dialogs below remain deliberately simple and can later be replaced by accessible shadcn Dialog components.

# 13 Frontend: registration and scanner

## frontend/src/App.tsx

This file continues in chapter 14. Concatenate both listings.

```tsx
import { useEffect,useRef,useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api,login,logout } from './api';
import { Button } from './components/ui/button';
type Row=Record<string,any>;
const categories=['EXECUTIVE','PENJAGA','VENDOR','CONTRACTOR'];
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function Fields({names,values,set}: {names:string[];values:Record<string,string>;
 set:(v:Record<string,string>)=>void}) {
 return <>{names.map(name=><label key={name}>{name}
  <input name={name} required maxLength={name==='purpose'?200:120}
   type={name==='password'?'password':name==='phone'?'tel':'text'}
   value={values[name]??''} onChange={e=>set({...values,[name]:e.target.value})}/>
 </label>)}</>;
}
function Registration() {
 const [form,setForm]=useState<Record<string,string>>({category:'EXECUTIVE'});
 const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 const [reference,setReference]=useState('');
 const set=(v:Record<string,string>)=>{setForm(v);setMessage('');};
 async function submit(e:React.FormEvent) {
  e.preventDefault();setBusy(true);setMessage('Submitting. Do not reload.');
  try {const r=await api('/public/registrations',form);setReference(r.reference);}
  catch(e){setMessage(String(e)+'\nYour input is preserved. Retry without reloading.');}
  finally{setBusy(false);}
 }
 return <main className="public"><h1>Visitor registration</h1>
  <p className="notice">Teaching environment. Hospital validation is MOCK.
   Use synthetic details only. No door access is granted by this form.</p>
  {reference?<section><h2>Submitted</h2><p>Show this reference at the counter:</p>
   <strong>{reference}</strong><p>Wait for staff verification and card assignment.</p>
   <a href="/register">Start another registration</a></section>:
  <form onSubmit={submit}><fieldset disabled={busy}><legend>Visitor details</legend>
   <label>Category<select value={form.category}
    onChange={e=>set({...form,category:e.target.value,mrn:'',ward:'',organization:''})}>
    {categories.map(c=><option key={c}>{c}</option>)}</select></label>
   <Fields names={['name','phone','destination','purpose']} values={form} set={set}/>
   {['VENDOR','CONTRACTOR'].includes(form.category) &&
    <Fields names={['organization']} values={form} set={set}/>}
   {form.category==='PENJAGA' && <>
    <Fields names={['mrn','ward']} values={form} set={set}/>
    <p className="muted">Fixture: DEMO-0001 / WARD-A. Timeout: DEMO-TIMEOUT.</p>
    <Button type="button" onClick={async()=>{setBusy(true);try{
     const r=await api('/public/mrn',{mrn:form.mrn??'',ward:form.ward??''});
     setMessage('MOCK validation: '+r.result);
    }catch(e){setMessage(String(e));}finally{setBusy(false);}}}>Check MRN</Button>
   </>}
   <label className="check"><input type="checkbox" required checked={form.consent==='yes'}
    onChange={e=>set({...form,consent:e.target.checked?'yes':'no'})}/>
    I understand this demonstration stores the supplied test details.</label>
   <Button className="primary" type="submit">{busy?'Please wait':'Submit registration'}</Button>
  </fieldset></form>}
  <p role="status" aria-live="polite" className="status">{message||'Ready'}</p>
 </main>;
}
function Scan({target,onDone}:{target?:string;onDone:()=>void}) {
 const [state,setState]=useState('Idle');const [job,setJob]=useState('');
 const [uid,setUid]=useState('');const [category,setCategory]=useState(categories[0]);
 const [busy,setBusy]=useState(false);const generation=useRef(0);const current=useRef('');
 useEffect(()=>()=>{generation.current++;if(current.current)
  void api(`/staff/scans/${current.current}/cancel`,{}).catch(()=>{});},[]);
 async function cancel() {
  generation.current++;const old=current.current;current.current='';
  setJob('');setUid('');setState('Cancelled');setBusy(false);
  if(old)try{await api(`/staff/scans/${old}/cancel`,{});}catch(e){setState(String(e));}
 }
 async function start() {
  if(current.current) await cancel();
  const epoch=++generation.current;setBusy(true);setUid('');setState('Creating scan job');
  try {
   const j=await api('/staff/scans',{purpose:target?'ISSUE':'ENROLL',target:target??''});
   if(epoch!==generation.current){await api(`/staff/scans/${j.id}/cancel`,{});return;}
   current.current=j.id;setJob(j.id);setState('Remove any card, then tap the selected card');
   for(let n=0;n<95;n++) {
    await sleep(1000);if(epoch!==generation.current)return;
    const r=await api(`/staff/scans/${j.id}`);
    // [U02] Late results from a cancelled scan cannot update this panel.
    if(epoch!==generation.current)return;
    if(r.state==='READY'){setUid(r.uid);setState('Read complete. Confirm below.');return;}
    if(['ERROR','CANCELLED','CONSUMED'].includes(r.state))throw new Error('SCAN_'+r.state);
   }
   throw new Error('SCAN_TIMEOUT');
  }catch(e){if(epoch===generation.current)setState(String(e));}
  finally{if(epoch===generation.current)setBusy(false);}
 }
 async function commit() {
  setBusy(true);try{
   const r=target?await api('/staff/assignments',{registrationId:target,scanId:job}):
    await api('/admin/cards',{scanId:job,category});
   current.current='';setJob('');setUid('');
   setState(target?`Assigned ${r.uid}. Hand card to visitor. Proof PENDING.`:'Card enrolled.');
   onDone();
  }catch(e){setState(String(e));}finally{setBusy(false);}
 }
 return <section className="scan"><h2>{target?'Assign access card':'Enroll access card'}</h2>
  <p className="muted">Category source: inventory mapping. One configured counter reader.</p>
  {!target&&<label>Inventory category<select disabled={busy} value={category}
   onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}
  </select></label>}
  <p className="status" role="status">{state}</p>{uid&&<p>Scanned UID: <strong>{uid}</strong></p>}
  <div className="actions"><Button disabled={busy} onClick={start}>Scan / retry</Button>
   <Button disabled={!job} onClick={cancel}>Cancel</Button>
   <Button className="primary" disabled={!uid||busy} onClick={commit}>Confirm</Button></div>
 </section>;
}
function Table({rows,action}:{rows:Row[];action?:(r:Row)=>React.ReactNode}) {
 const keys=rows.length?Object.keys(rows[0]):[];
 return rows.length?<div className="table-wrap"><table><thead><tr>
  {keys.map(k=><th key={k}>{k}</th>)}{action&&<th>Actions</th>}</tr></thead>
  <tbody>{rows.map((r,i)=><tr key={r.id??r.uid??r.username??i}>
   {keys.map(k=><td key={k}>{r[k]===null?'--':String(r[k])}</td>)}
   {action&&<td>{action(r)}</td>}</tr>)}</tbody></table></div>:<p>No records found.</p>;
}
```

[U02] High: generation counters prevent stale scan results from changing a newly opened context. Cancel also calls Backend; local cancellation alone cannot revoke server evidence. The scan panel is remounted when the selected registration changes.

The server repeats MRN validation regardless of whether the separate Check MRN button was used. The registration form preserves input on errors but deliberately avoids persistent browser storage of patient details.

# 14 Frontend: staff and administrator workspace

## App.tsx, final continuation

```tsx
export default function App() {
 const [user,setUser]=useState<Row|null>(null);const [ready,setReady]=useState(false);
 const [credentials,setCredentials]=useState<Record<string,string>>({});
 const [tab,setTab]=useState('Queue');const [page,setPage]=useState(0);
 const [rows,setRows]=useState<Row[]>([]);const [detail,setDetail]=useState<Row|null>(null);
 const [summary,setSummary]=useState<Row>({});const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);
 const [account,setAccount]=useState<Record<string,string>>(
  {role:'COUNTER_STAFF',active:'true'});
 const [hours,setHours]=useState('8');
 const refresh=()=>setRevision(x=>x+1);
 const publicPage=window.location.pathname==='/register';
 useEffect(()=>{api('/auth/me').then(setUser).catch(()=>{}).finally(()=>setReady(true));
  const end=()=>{setUser(null);setDetail(null);};
  window.addEventListener('session-expired',end);
  return()=>window.removeEventListener('session-expired',end);},[]);
 useEffect(()=>{
  if(!user||publicPage)return;
  let live=true;
  async function load(){try{
   const paths:Record<string,string>={Queue:'/staff/registrations',
    Assignments:'/staff/assignments',Inventory:'/admin/cards',
    Users:'/admin/users',Audit:'/admin/proofs'};
   if(paths[tab]) {const r=await api(paths[tab]+`?page=${page}`);if(live)setRows(r);}
   if(tab==='Summary'){const r=await api('/staff/summary');if(live)setSummary(r);}
   if(tab==='Settings'){const r=await api('/admin/settings');if(live)setHours(String(r.hours));}
  }catch(e){if(live)setMessage(String(e));}}
  void load();const timer=['Queue','Assignments','Inventory','Audit','Summary'].includes(tab)
   ?setInterval(load,5000):undefined;
  return()=>{live=false;if(timer)clearInterval(timer);};
 },[tab,page,user,revision,publicPage]);
 async function action(fn:()=>Promise<unknown>) {
  setBusy(true);setMessage('Working...');
  try{await fn();setMessage('Completed');refresh();}
  catch(e){setMessage(String(e));}finally{setBusy(false);}
 }
 const header=<header><div><strong>HSAAS</strong><small>Visitor & Pass Management</small></div>
  <div>{user?<><span>{user.username} / {user.admin?'Admin':'Counter staff'} </span>
   <Button onClick={()=>action(async()=>{await logout();setUser(null);})}>Log out</Button></>:
   <a href={publicPage?'/':'/register'}>{publicPage?'Staff login':'Visitor registration'}</a>}</div>
 </header>;
 if(publicPage)return <>{header}<Registration/></>;
 if(!ready)return <>{header}<main><p>Loading session...</p></main></>;
 if(!user)return <>{header}<main className="public"><h1>Staff login</h1>
  <form onSubmit={e=>{e.preventDefault();void action(async()=>
   setUser(await login(credentials.username??'',credentials.password??'')));}}>
   <Fields names={['username','password']} values={credentials} set={setCredentials}/>
   <Button className="primary" disabled={busy}>Log in</Button></form>
  <p role="alert">{message}</p></main></>;
 const tabs=['Queue','Assignments','Summary','QR',
  ...(user.admin?['Inventory','Users','Settings','Audit']:[])];
 return <>{header}<main><nav aria-label="Workspace">{tabs.map(t=>
  <Button key={t} aria-pressed={tab===t} onClick={()=>{
   setTab(t);setPage(0);setRows([]);setDetail(null);setMessage('');}}>{t}</Button>)}</nav>
  <h1>{tab}</h1><p className="notice">MOCK hospital adapter. Synthetic data only.
   Card category is assigned in inventory. Proof confirmation is asynchronous.</p>
  <p className="status" role="status">{message||'Ready'}</p>
  {['Queue','Assignments','Audit'].includes(tab)&&<div className="actions">
   <Button disabled={!page} onClick={()=>setPage(x=>x-1)}>Previous</Button>
   <span>Page {page+1}</span><Button disabled={rows.length<20}
    onClick={()=>setPage(x=>x+1)}>Next</Button></div>}
  {tab==='Queue'&&<><Table rows={rows} action={r=><Button disabled={busy}
   onClick={()=>action(async()=>setDetail(await api(`/staff/registrations/${r.id}`)))}>
   Review</Button>}/>{detail&&<section><h2>Registration {detail.id}</h2>
   <dl>{Object.entries(detail.data).map(([k,v])=><div key={k}><dt>{k}</dt>
    <dd>{String(v)}</dd></div>)}</dl><p>{detail.category} / {detail.state}</p>
   {detail.state==='SUBMITTED'&&<div className="actions">
    <Button disabled={busy} onClick={()=>action(async()=>{
     await api(`/staff/registrations/${detail.id}/review`,{decision:'VERIFIED'});
     setDetail(await api(`/staff/registrations/${detail.id}`));})}>Verify information</Button>
    <Button disabled={busy} onClick={()=>{const reason=prompt('Reason for rejection');
     if(reason)void action(async()=>{await api(`/staff/registrations/${detail.id}/review`,
      {decision:'REJECTED',reason});setDetail(null);});}}>Reject</Button></div>}
   {detail.state==='VERIFIED'&&<Scan key={detail.id} target={detail.id} onDone={refresh}/>}
  </section>}</>}
  {tab==='Assignments'&&<Table rows={rows} action={r=>r.state!=='RETURNED'&&
   <Button disabled={busy} onClick={()=>{if(confirm(`Confirm return of ${r.uid}?`))
    void action(()=>api(`/staff/assignments/${r.id}/return`,{}));}}>Return</Button>}/>}
  {tab==='Inventory'&&<><Scan onDone={refresh}/><p>First 500 cards, ordered by UID.</p>
   <Table rows={rows} action={r=><Button disabled={busy||r.state==='ISSUED'}
    onClick={()=>action(()=>api(`/admin/cards/${r.uid}/state`,
     {state:r.state==='DISABLED'?'AVAILABLE':'DISABLED'}))}>
    {r.state==='DISABLED'?'Enable':'Disable'}</Button>}/></>}
  {tab==='Users'&&<><Table rows={rows} action={r=><Button onClick={()=>setAccount(
   {username:r.username,role:r.role,active:String(r.active),password:''})}>Edit</Button>}/>
   <section><h2>Create or edit account</h2><form onSubmit={e=>{e.preventDefault();
    void action(()=>api('/admin/users',account));}}>
    <Fields names={['username']} values={account} set={setAccount}/>
    <label>New account password only (16+ characters)
     <input type="password" maxLength={72} value={account.password??''}
      onChange={e=>setAccount({...account,password:e.target.value})}/></label>
    <label>Role<select value={account.role} onChange={e=>setAccount({...account,role:e.target.value})}>
     <option>COUNTER_STAFF</option><option>ADMIN</option></select></label>
    <label>Active<select value={account.active}
     onChange={e=>setAccount({...account,active:e.target.value})}>
     <option value="true">Enabled</option><option value="false">Disabled</option></select></label>
    <Button disabled={busy}>Save account</Button></form></section></>}
  {tab==='Settings'&&<form onSubmit={e=>{e.preventDefault();
   void action(()=>api('/admin/settings',{hours}));}}><label>Loan duration (hours)
   <input type="number" min="1" max="168" value={hours}
    onChange={e=>setHours(e.target.value)}/></label><Button disabled={busy}>Save</Button>
   <p>Changes affect future assignments only.</p></form>}
  {tab==='Summary'&&<section><p>Pending review: {summary.queue} / Active: {summary.active}
   {' / '}Overdue: {summary.overdue}</p><h2>All-time registrations by category</h2>
   <Table rows={summary.registrations??[]}/></section>}
  {tab==='QR'&&<section><h2>Scan to register</h2>
   <QRCodeSVG value={window.location.origin+'/register'} size={240} marginSize={4}/>
   <p>{window.location.origin}/register</p>
   <p>Use the deployed HTTPS address, not localhost, when printing for phones.</p></section>}
  {tab==='Audit'&&<><Table rows={rows} action={r=><Button onClick={()=>action(async()=>{
   const p=await api(`/admin/proofs/${r.id}`);setDetail(p);})}>Inspect</Button>}/>
   {detail&&<section><h2>Local snapshot check</h2><p>
    {detail.localIntegrity?'LOCAL MATCH':'LOCAL MISMATCH'} - not an on-chain verdict.</p>
    <pre>{detail.payload}</pre><p>Independent verification:
     {' node verify.mjs '+detail.id}</p></section>}</>}
 </main></>;
}
```

Review, assignment, return and admin commands are complete UI interactions, not simulated success messages. Every mutation awaits Backend. Polling updates operational state but does not replace server authorization. The verifier is a privileged command-line tool instead of embedding a private database connection in the browser.

Known UI boundaries: native confirmations instead of custom dialogs, English-only copy, no historical chart/export builder and no approved hospital branding. Use the guideline's design process to refine these without weakening the backend invariants.

# 15 Windows reader agent

## reader-agent/pom.xml

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
 <modelVersion>4.0.0</modelVersion>
 <groupId>edu.upm</groupId><artifactId>reader-agent</artifactId><version>1.0.0</version>
 <properties><maven.compiler.release>21</maven.compiler.release>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding></properties>
 <dependencies><dependency><groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId><version>2.19.2</version></dependency></dependencies>
 <build><plugins><plugin><groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId><version>3.14.0</version></plugin>
  <plugin><groupId>org.codehaus.mojo</groupId><artifactId>exec-maven-plugin</artifactId>
   <version>3.5.0</version><configuration><mainClass>ReaderAgent</mainClass></configuration>
  </plugin></plugins></build>
</project>
```

## reader-agent/src/main/java/ReaderAgent.java

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import javax.smartcardio.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

public class ReaderAgent {
 static final ObjectMapper JSON=new ObjectMapper();
 static final HttpClient HTTP=HttpClient.newBuilder()
  .connectTimeout(Duration.ofSeconds(8)).build();
 static String env(String key) {
  String v=System.getenv(key);
  if(v==null||v.isBlank())throw new IllegalStateException("Missing "+key);
  return v;
 }
 static Map<String,Object> post(String path,Map<String,String> body,String key)
 throws Exception {
  String base=env("API_URL");
  URI uri=URI.create(base);
  if(!uri.getScheme().equals("https") &&
   !(uri.getScheme().equals("http")&&Set.of("localhost","127.0.0.1").contains(uri.getHost())))
   throw new IllegalStateException("HTTPS required outside loopback");
  var request=HttpRequest.newBuilder(URI.create(base+"/api/device"+path))
   .timeout(Duration.ofSeconds(15)).header("Authorization","Bearer "+env("DEVICE_TOKEN"))
   .header("Content-Type","application/json").header("Idempotency-Key",key)
   .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body))).build();
  Exception last=null;
  for(int attempt=0;attempt<3;attempt++) {
   try {
    var r=HTTP.send(request,HttpResponse.BodyHandlers.ofString());
    if(r.statusCode()!=200)throw new IllegalStateException("DEVICE_HTTP_"+r.statusCode());
    return JSON.readValue(r.body(),new TypeReference<Map<String,Object>>(){});
   }catch(java.io.IOException e){last=e;Thread.sleep(1000L*(attempt+1));}
  }
  throw last;
 }
 static String read() throws Exception {
  String mock=System.getenv("MOCK_UID");
  if(mock!=null&&!mock.isBlank()) {
   System.out.println("MOCK READER: simulated tap, no physical evidence");
   Thread.sleep(1500);return mock;
  }
  var terminals=TerminalFactory.getDefault().terminals().list();
  String name=env("READER_NAME");
  var terminal=terminals.stream().filter(t->t.getName().equals(name))
   .findFirst().orElseThrow(()->new IllegalStateException("READER_NOT_FOUND"));
  // [R02] Removal gates successive scans; one held card is not many taps.
  if(terminal.isCardPresent()&&!terminal.waitForCardAbsent(15000))
   throw new IllegalStateException("REMOVE_CARD");
  System.out.println("Tap card now");
  if(!terminal.waitForCardPresent(45000))throw new IllegalStateException("READ_TIMEOUT");
  Card card=terminal.connect("*");
  try {
   var response=card.getBasicChannel().transmit(new CommandAPDU(new byte[]{
    (byte)0xff,(byte)0xca,0,0,0}));
   if(response.getSW()!=0x9000)throw new IllegalStateException("APDU_STATUS");
   byte[] bytes=response.getData();
   if(bytes.length<4||bytes.length>10)throw new IllegalStateException("UID_LENGTH");
   return HexFormat.of().withUpperCase().formatHex(bytes);
  }finally{card.disconnect(false);}
 }
 public static void main(String[] args) throws Exception {
  if(args.length>0&&args[0].equals("list")) {
   TerminalFactory.getDefault().terminals().list().forEach(t->System.out.println(t.getName()));
   return;
  }
  env("API_URL");env("DEVICE_TOKEN");
  while(!Thread.currentThread().isInterrupted()) {
   try {
    var job=post("/claim",Map.of(),UUID.randomUUID().toString());
    if("READING".equals(job.get("state"))) {
     Map<String,String> result=new HashMap<>();
     result.put("lease",job.get("lease").toString());
     try {result.put("uid",read());result.put("state","READY");}
     catch(Exception e){result.put("state","ERROR");System.err.println("Read failed");}
     post("/result/"+job.get("id"),result,UUID.randomUUID().toString());
    }
   }catch(Exception e){System.err.println("Agent operation failed: "+e.getClass().getSimpleName());}
   Thread.sleep(2000);
  }
 }
}
```

[R02] High: without removal gating, leaving a card on the reader can satisfy a later job unintentionally. A failed read uploads ERROR, never the last successful UID. HTTPS protects bearer-token transit. This single-device reference requires a stable API_URL without a trailing slash and the exact READER_NAME shown by list mode.

Windows setup: install the vendor driver; verify Smart Card service and the contactless slot; run mvn compile exec:java -Dexec.args=list to enumerate; then set API_URL, DEVICE_TOKEN and READER_NAME. Use MOCK_UID only for explicitly labelled mock tests. Never mix mock claims with real evidence. Set Backend READER_LABEL to 'MOCK' when testing that mode.

For autostart, first verify native Windows execution, then package dependencies or use a wrapper script launched by Task Scheduler under a restricted account. Do not run the reader in Railway or assume WSL USB access. Secrets belong in protected machine configuration; rotate DEVICE_TOKEN on both ends when compromised.

# 16 Move package and immutable commitments

## move/hsaas_audit/Move.toml

```toml
[package]
name = "hsaas_audit"
edition = "2024"

[addresses]
hsaas_audit = "0x0"
```

Use a current Testnet-compatible Sui CLI with automatic framework dependencies. If its generated manifest differs, start from sui move new hsaas_audit and retain its framework resolution rather than guessing a Git revision. Commit the generated Move.lock after build. The sources below target the 2024 edition.

## move/hsaas_audit/sources/audit.move

```move
module hsaas_audit::audit {
 use sui::object::{Self, UID, ID};
 use sui::table::{Self, Table};
 use sui::transfer;
 use sui::event;
 use sui::tx_context::{Self, TxContext};

 public struct WriterCap has key, store { id: UID, registry: ID }
 public struct Registry has key {
  id: UID,
  proofs: Table<vector<u8>, vector<u8>>,
 }
 public struct Anchored has copy, drop {
  registry: ID, event_id: vector<u8>, hash: vector<u8>, version: u64,
 }
 fun create(ctx: &mut TxContext): (WriterCap, Registry) {
  let registry=Registry { id: object::new(ctx), proofs: table::new(ctx) };
  let cap=WriterCap { id: object::new(ctx), registry: object::id(&registry) };
  (cap, registry)
 }
 fun init(ctx: &mut TxContext) {
  let (cap, registry)=create(ctx);
  transfer::public_transfer(cap,tx_context::sender(ctx));
  transfer::share_object(registry);
 }
 public entry fun anchor(cap: &WriterCap, registry: &mut Registry,
  event_id: vector<u8>, hash: vector<u8>, version: u64) {
  // [M01] Capability is bound to this registry, not merely to a type.
  assert!(cap.registry==object::id(registry),1);
  assert!(event_id.length()==36 && hash.length()==32 && version==1,2);
  if (table::contains(&registry.proofs,&event_id)) {
   // [M02] An existing event can never be overwritten with a new hash.
   assert!(*table::borrow(&registry.proofs,&event_id)==hash,3);
  } else {
   table::add(&mut registry.proofs,copy event_id,copy hash);
  };
  event::emit(Anchored {registry:object::id(registry),event_id,hash,version});
 }
 #[test_only]
 public fun fixture(ctx: &mut TxContext): (WriterCap, Registry) { create(ctx) }
 #[test_only]
 public fun finish(cap: WriterCap, registry: Registry, ctx: &TxContext) {
  transfer::public_transfer(cap,tx_context::sender(ctx));
  transfer::share_object(registry);
 }
}
```

[M01] Critical: possession of WriterCap is necessary; a capability created for a different registry cannot write here. Only initialization can create production resources. Do not add an unrestricted public mint-cap function.

[M02] Critical: identical event/hash retries preserve the commitment; a conflicting hash aborts. An identical retry may emit another matching event, but never a conflicting stored proof. The worker normally retries the exact same signed transaction, preserving the original transaction digest and effects.

Retained UpgradeCap authority affects trust assumptions. Keep publisher/upgrade secrets away from the worker and document whether upgrades remain possible. 'Immutable commitment' describes this module's update rules, not a promise that an administrator with upgrade powers can never change application behavior.

# 17 Move tests and publication procedure

## move/hsaas_audit/tests/audit_tests.move

```move
#[test_only]
module hsaas_audit::audit_tests {
 use hsaas_audit::audit;
 use sui::tx_context;

 #[test]
 fun identical_retry() {
  let mut ctx=tx_context::dummy();
  let (cap, mut registry)=audit::fixture(&mut ctx);
  let id=b"12345678-1234-1234-1234-123456789012";
  let hash=b"01234567890123456789012345678901";
  audit::anchor(&cap,&mut registry,id,hash,1);
  audit::anchor(&cap,&mut registry,id,hash,1);
  audit::finish(cap,registry,&ctx);
 }
 #[test]
 #[expected_failure(abort_code=3, location=hsaas_audit::audit)]
 fun conflicting_hash() {
  let mut ctx=tx_context::dummy();
  let (cap, mut registry)=audit::fixture(&mut ctx);
  let id=b"12345678-1234-1234-1234-123456789012";
  audit::anchor(&cap,&mut registry,id,b"01234567890123456789012345678901",1);
  audit::anchor(&cap,&mut registry,id,b"11234567890123456789012345678901",1);
  audit::finish(cap,registry,&ctx);
 }
 #[test]
 #[expected_failure(abort_code=2, location=hsaas_audit::audit)]
 fun invalid_length() {
  let mut ctx=tx_context::dummy();
  let (cap, mut registry)=audit::fixture(&mut ctx);
  audit::anchor(&cap,&mut registry,b"bad",b"short",1);
  audit::finish(cap,registry,&ctx);
 }
 #[test]
 #[expected_failure(abort_code=1, location=hsaas_audit::audit)]
 fun wrong_registry() {
  let mut ctx=tx_context::dummy();
  let (cap1, reg1)=audit::fixture(&mut ctx);
  let (cap2, mut reg2)=audit::fixture(&mut ctx);
  audit::anchor(&cap1,&mut reg2,b"12345678-1234-1234-1234-123456789012",
   b"01234567890123456789012345678901",1);
  audit::finish(cap1,reg1,&ctx); audit::finish(cap2,reg2,&ctx);
 }
}
```

Run from the package directory using Bash/WSL or the supported native CLI:

```bash
sui --version
sui client switch --env testnet
sui client active-address
sui client gas
sui move build
sui move test
sui client publish --gas-budget 100000000
```

The gas budget is an example cap in MIST, not a guaranteed price. Obtain Testnet tokens from the official faucet. Save the successful package ID, shared Registry ID, address-owned WriterCap ID, transaction digest and UpgradeCap custody. Transfer the WriterCap deliberately if using a separate worker address, then verify ownership before running the worker.

Acceptance is the actual CLI output from your pinned version plus a real Testnet round trip. None is claimed already executed. A different address attempting to use someone else's owned capability should also fail at transaction authorization; record that negative network test separately.

# 18 Worker configuration and durable submission

This reference uses a single worker guarded by a MySQL connection-owned named lock, rather than the guideline's multi-worker lease design. The lock is not a business transaction or a row lock. Signed bytes and signature are persisted before submission, so an interrupted worker can replay the exact transaction. Do not run another tool spending the worker's gas objects while an unknown transaction is being reconciled.

## sui-worker/package.json

```json
{
 "name":"hsaas-audit-worker","private":true,"version":"1.0.0","type":"module",
 "scripts":{"start":"node worker.mjs","verify":"node verify.mjs",
  "check":"node --check worker.mjs && node --check verify.mjs"},
 "dependencies":{"@mysten/sui":"^2.0.0","mysql2":"^3.14.0"}
}
```

Install once with npm install, inspect resolved SDK version and commit package-lock.json. Thereafter use npm ci. The listings use the documented v2 client API checked for this edition; if a resolved minor release changes types, consult its API definitions and preserve the lockfile. Worker code is JavaScript ESM so that the PDF does not require a separate compiler configuration.

## sui-worker/worker.mjs

```javascript
import mysql from 'mysql2/promise';
import { createHash } from 'node:crypto';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { normalizeSuiAddress } from '@mysten/sui/utils';

const env=k=>{if(!process.env[k])throw Error('Missing '+k);return process.env[k];};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const db=await mysql.createConnection({host:env('DB_HOST'),port:+env('DB_PORT'),
 user:env('DB_USER'),password:env('DB_PASSWORD'),database:env('DB_NAME')});
const client=new SuiGrpcClient({network:'testnet',baseUrl:env('SUI_GRPC_URL')});
const signer=Ed25519Keypair.fromSecretKey(env('SUI_PRIVATE_KEY'));
if(normalizeSuiAddress(signer.toSuiAddress())!==normalizeSuiAddress(env('EXPECTED_ADDRESS')))
 throw Error('WRONG_SIGNER');
// [W01] Check the chain identity; the network label alone is not verification.
if((await client.getChainIdentifier()).chainIdentifier!==env('EXPECTED_CHAIN_ID'))
 throw Error('WRONG_CHAIN');
const [lock]=await db.query("SELECT GET_LOCK('hsaas-audit-worker',0) AS acquired");
if(lock[0].acquired!==1)throw Error('WORKER_ALREADY_RUNNING');
const balance=await client.getBalance({owner:signer.toSuiAddress()});
if(BigInt(balance.balance.balance)===0n)throw Error('NO_TEST_GAS');
const cap=await client.getObject({objectId:env('WRITER_CAP_ID')});
if(cap.object.owner.$kind!=='AddressOwner' ||
 normalizeSuiAddress(cap.object.owner.AddressOwner)!==normalizeSuiAddress(signer.toSuiAddress()))
 throw Error('CAP_NOT_OWNED');
let stopped=false;
process.on('SIGTERM',()=>{stopped=true;});process.on('SIGINT',()=>{stopped=true;});
try {
 while(!stopped) {
  const [rows]=await db.execute(`
   SELECT o.*,a.hash,a.payload FROM outbox o
   JOIN audit_events a ON a.id=o.event_id
   WHERE o.state IN ('PENDING','SUBMITTED','RETRY') AND o.attempts<12
   ORDER BY a.created_at,a.id LIMIT 1`);
  if(!rows.length){await sleep(2000);continue;}
  const row=rows[0];
  const local=createHash('sha256').update(row.payload,'utf8').digest('hex');
  if(local!==row.hash){
   await db.execute("UPDATE outbox SET state='FAILED',error_code='LOCAL_HASH' WHERE event_id=?",
    [row.event_id]);continue;
  }
  let bytes=row.tx_bytes?Buffer.from(row.tx_bytes,'base64'):null;
  let signature=row.signature;
  try {
   if(!bytes) {
    const tx=new Transaction();tx.setSender(signer.toSuiAddress());
    tx.moveCall({target:`${env('PACKAGE_ID')}::audit::anchor`,arguments:[
     tx.object(env('WRITER_CAP_ID')),tx.object(env('REGISTRY_ID')),
     tx.pure.vector('u8',[...Buffer.from(row.event_id,'utf8')]),
     tx.pure.vector('u8',[...Buffer.from(row.hash,'hex')]),tx.pure.u64(1)]});
    bytes=await tx.build({client});
    ({signature}=await signer.signTransaction(bytes));
   }
  }catch(e){
   await db.execute(`UPDATE outbox SET state='RETRY',attempts=attempts+1,
    error_code='BUILD_UNAVAILABLE' WHERE event_id=?`,[row.event_id]);
   await sleep(10000);continue;
  }
  // [W02] Commit exact signed intent BEFORE any execution request.
  // A DB failure here exits the worker; unsigned/unpersisted work is not submitted.
  await db.execute(`UPDATE outbox SET tx_bytes=?,signature=?,state='SUBMITTED',
   attempts=attempts+1 WHERE event_id=?`,[Buffer.from(bytes).toString('base64'),signature,row.event_id]);
  let result;
  try {
   result=row.digest?await client.getTransaction({digest:row.digest}):
    await client.executeTransaction({transaction:bytes,signatures:[signature]});
  }catch(e){
   await db.execute("UPDATE outbox SET error_code='OUTCOME_UNKNOWN' WHERE event_id=?",
    [row.event_id]);
   await sleep(Math.min(60000,2000*2**Math.min(row.attempts,5)));continue;
  }
  const transaction=result.Transaction??result.FailedTransaction;
  await db.execute("UPDATE outbox SET digest=? WHERE event_id=?",
   [transaction.digest,row.event_id]);
  if(result.$kind==='FailedTransaction'||!transaction.status.success){
   await db.execute("UPDATE outbox SET state='FAILED',error_code='MOVE_FAILED' WHERE event_id=?",
    [row.event_id]);continue;
  }
  try {await client.waitForTransaction({digest:transaction.digest,timeout:30000});}
  catch(e){await sleep(5000);continue;}
  // [W03] A known successful, indexed transaction is required for CONFIRMED.
  await db.execute("UPDATE outbox SET state='CONFIRMED',error_code=NULL WHERE event_id=?",
   [row.event_id]);
 }
}finally{
 await db.query("SELECT RELEASE_LOCK('hsaas-audit-worker')");await db.end();
}
```

[W01] Critical: an environment label does not stop a misconfigured URL from pointing to another chain. Set EXPECTED_CHAIN_ID from a trusted Testnet reference and verify it once before normal operation. Package/cap/registry must all belong to that same deployment.

[W02] Critical: replaying the same signed bytes prevents an ambiguous network response from creating a new transaction intent. Database query failures are fatal rather than silently continuing without the named lock. MySQL connection loss releases that lock; a restarted worker resumes stored bytes. Test connection loss and process termination around each persistence boundary.

[W03] Critical: a returned FailedTransaction is not success. The worker records definitive failure; unknown network outcome remains SUBMITTED. After twelve attempts, rows stop automatic retry and require operator investigation; they are not labelled successful or definitively failed just because time elapsed. The named lock requires the same MySQL server across workers and a direct persistent connection, not a transaction-pooling proxy.

# 19 Independent on-chain proof verifier

## sui-worker/verify.mjs

This tool needs read-only database access, expected network/package/registry settings and an event ID. It does not need the signing key. It parses the BCS event fields emitted by the exact Move layout in chapter 16, instead of trusting an outbox status label or loosely shaped JSON.

```javascript
import mysql from 'mysql2/promise';
import { createHash } from 'node:crypto';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { bcs } from '@mysten/sui/bcs';
import { normalizeSuiAddress } from '@mysten/sui/utils';
const env=k=>{if(!process.env[k])throw Error('Missing '+k);return process.env[k];};
const id=process.argv[2];
if(!id||!/^[0-9a-f-]{36}$/i.test(id))throw Error('Supply event UUID');
const db=await mysql.createConnection({host:env('DB_HOST'),port:+env('DB_PORT'),
 user:env('DB_USER'),password:env('DB_PASSWORD'),database:env('DB_NAME')});
const eventType=bcs.struct('Anchored',{
 registry:bcs.Address,event_id:bcs.vector(bcs.u8()),hash:bcs.vector(bcs.u8()),version:bcs.u64()
});
try{
 const [rows]=await db.execute(`SELECT a.payload,a.hash,o.digest
  FROM audit_events a JOIN outbox o ON a.id=o.event_id WHERE a.id=?`,[id]);
 if(!rows.length)throw Error('LOCAL_EVENT_NOT_FOUND');
 const row=rows[0];const computed=createHash('sha256').update(row.payload,'utf8').digest('hex');
 if(computed!==row.hash){console.log('MISMATCH: local payload changed');process.exitCode=2;}
 else if(!row.digest){console.log('NOT_ANCHORED_OR_UNKNOWN: no recorded transaction digest');}
 else{
  const client=new SuiGrpcClient({network:'testnet',baseUrl:env('SUI_GRPC_URL')});
  if((await client.getChainIdentifier()).chainIdentifier!==env('EXPECTED_CHAIN_ID'))
   throw Error('WRONG_CHAIN');
  const result=await client.getTransaction({digest:row.digest,include:{events:true}});
  if(result.$kind==='FailedTransaction'){
   console.log('NOT_ANCHORED: recorded transaction failed');process.exitCode=2;
  }else{
   const expected=normalizeSuiAddress(env('PACKAGE_ID'))+'::audit::Anchored';
   const matches=result.Transaction.events.filter(e=>e.eventType===expected)
    .map(e=>eventType.parse(e.bcs)).filter(e=>
     normalizeSuiAddress(e.registry)===normalizeSuiAddress(env('REGISTRY_ID')) &&
     Buffer.from(e.event_id).toString('utf8')===id && String(e.version)==='1');
   const ok=matches.some(e=>Buffer.from(e.hash).toString('hex')===computed);
   console.log(ok?'MATCH: snapshot matches the on-chain commitment':'MISMATCH: no matching event');
   if(!ok)process.exitCode=2;
  }
 }
}catch(e){console.log('UNAVAILABLE: verify configuration, database and node');process.exitCode=3;}
finally{await db.end();}
```

Meaning: MATCH compares local bytes against an event from the expected package and registry on the expected network. Purpose: detecting altered snapshot bytes and incorrect proof references. Importance: Critical. It does not prove that a person actually visited, that an MRN was medically correct or that a card is unclonable.

If the worker lost its response and has no recorded digest yet, the tool reports uncertainty, not absence of any possible chain transaction. Resume exact-byte reconciliation first. Wrong configuration and network outages remain UNAVAILABLE, not tampering. Keep expected identifiers outside the database being tested so changing both a row and its local configuration is not silently accepted.

# 20 Executable unit tests and integration gates

## backend/src/test/java/edu/upm/hsaas/RulesTest.java

```java
package edu.upm.hsaas;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class RulesTest {
 @Test void normalizesUid() {
  assertEquals("04AABBCC",Store.uid("04:aa:bb:cc"));
 }
 @Test void rejectsMalformedUid() {
  assertThrows(ResponseStatusException.class,()->Store.uid("04ZZ"));
  assertThrows(ResponseStatusException.class,()->Store.uid("040"));
 }
 @Test void hashIsStableAndSensitive() {
  assertEquals(64,Store.sha("snapshot").length());
  assertEquals(Store.sha("snapshot"),Store.sha("snapshot"));
  assertNotEquals(Store.sha("snapshot"),Store.sha("Snapshot"));
 }
 @Test void categoryAllowlist() {
  assertEquals(4,Store.CATEGORIES.size());
  assertFalse(Store.CATEGORIES.contains("ADMIN"));
 }
}
```

These small unit tests are not a substitute for database or browser tests. Run mvn test, npm run build, node syntax checks and sui move test separately. The following real-MySQL checks are mandatory before claiming the assembled reference works.

|Check|Procedure and expected evidence|
|Atomicity|Temporarily deny audit insert in a disposable DB user; issue fails and no assignment/card/scan change commits|
|Duplicate command|Repeat one issue with the same key/body; same ID, one event/outbox; different body with same key gets conflict|
|Concurrent card issue|Two independent authenticated sessions, two overlapping commands; only one active assignment survives|
|Review precondition|Call issue directly with SUBMITTED/REJECTED; both fail|
|Role/CSRF|Staff calls admin route; browser write lacks token; both are denied|
|Scan context|Submit wrong actor/purpose/target/expired scan; every case fails|
|MRN|DEMO-0001/WARD-A valid, other pair invalid, DEMO-TIMEOUT unavailable; invalid final submit creates nothing|
|Return|Return same assignment twice; one return event; card becomes AVAILABLE|
|Worker recovery|Kill before execute, after execute response and before confirmation; replay uses stored bytes|
|Proof|Change one payload byte in an isolated test copy; local check and independent verifier reject it|

For a true concurrent test, synchronize request start times and use separate sessions/transactions. Sequentially clicking twice is not a concurrency test. Save request bodies with synthetic data, status codes and final SQL counts. Browser tests must cover mobile registration, keyboard navigation, missing-reader/retry, duplicate UID and category mismatch.

Code review checklist: no TODO method bodies, every imported project file has a listing, no production credential in code, every API mutation reaches command(), all server state comes from the database, and all chain results pass through failure handling. Build/runtime gates remain your recorded results, not a claim inferred from this checklist.

# 21 Local setup with exact environment responsibilities

## infra/compose.yaml

```yaml
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: hsaas
      MYSQL_USER: hsaas_app
      MYSQL_PASSWORD: ${DB_PASSWORD:?Set DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:?Set DB_ROOT_PASSWORD}
    ports:
      - "127.0.0.1:3306:3306"
    volumes:
      - hsaas_mysql:/var/lib/mysql
volumes:
  hsaas_mysql:
```

Create an untracked infra/.env with your two different passwords. From the reference root run the following in PowerShell. Placeholder values are configuration, not shipped secrets. Replace them before running. The first command explicitly chooses the env file; Spring, Node and Java agent environments must be set separately.

```powershell
docker compose --env-file infra/.env -f infra/compose.yaml up -d
$env:DB_URL = 'jdbc:mysql://127.0.0.1:3306/hsaas?connectionTimeZone=UTC'
$env:DB_USER = 'hsaas_app'
$env:DB_PASSWORD = '<your local app password>'
$env:DEVICE_TOKEN = '<32+ random characters, shared only with reader>'
$env:BOOTSTRAP_PASSWORD = '<your unique 16+ character admin password>'
cd backend
mvn test
mvn spring-boot:run
```

In a second terminal, enter frontend, run npm.cmd install and npm.cmd run dev. Open the shown localhost URL. Login as admin using your own bootstrap password, create a staff account, set loan duration and use /register for a synthetic registration. Remove the bootstrap variable before subsequent launches.

In a third terminal set the reader environment and run from reader-agent:

```powershell
$env:API_URL = 'http://localhost:8080'
$env:DEVICE_TOKEN = '<same configured device token>'
$env:MOCK_UID = '04AABBCC'
cd reader-agent
mvn compile exec:java
```

This explicitly simulates a card for the first closed-loop test. For physical mode remove MOCK_UID from that process environment, set READER_NAME exactly and test with the vendor utility first. Stop and restart the agent when changing environment values. Never print the token in screenshots.

Worker environment uses DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, SUI_GRPC_URL, SUI_PRIVATE_KEY, EXPECTED_ADDRESS, EXPECTED_CHAIN_ID, PACKAGE_ID, REGISTRY_ID and WRITER_CAP_ID. Use a dedicated restricted worker database user in deployment. The verifier needs read access and public chain identifiers only, not a private key. Use an HTTPS Testnet node endpoint and a Testnet-only wallet.

Obtain EXPECTED_CHAIN_ID from a trusted Testnet client/reference during provisioning, record it in the deployment manifest and do not automatically overwrite it on every startup. Changing network or package requires a fresh environment or explicit migration, not editing identifiers underneath pending signed transactions.

# 22 Deploy, back up and recover

## backend/Dockerfile

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -B verify

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/app.jar /app/app.jar
USER 10001
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

Railway: create isolated MySQL and Backend services, select backend as root, use its Dockerfile, configure private database connectivity and the platform PORT. Set COOKIE_SECURE=true. Keep database and worker without public domains. Deploy the worker from sui-worker with npm ci and npm start and a single replica. Configure health at /actuator/health and test restart behavior.

Vercel: select frontend as root, Vite preset, npm run build and dist output. Add the following complete deployment file only after replacing the HTTPS domain. This is frontend/vercel.json; it was omitted from the local-only tree because it requires your actual deployment domain.

```json
{
 "rewrites":[
  {"source":"/api/:path*","destination":"https://YOUR-BACKEND-DOMAIN/api/:path*"},
  {"source":"/(.*)","destination":"/index.html"}
 ]
}
```

Verify Set-Cookie, POST/CSRF, no-store headers, deep-link reload and no localhost redirects through the real proxy. Print QR only from the deployed frontend origin. Keep the reader on the counter PC, not in the cloud. Platform plans, resource limits and costs must be checked before provisioning.

Before a release, back up MySQL and test restore to a separate database. This Bash command prompts for the password rather than exposing it as a command argument:

```bash
mysqldump --host=DB_HOST --user=BACKUP_USER -p \
 --single-transaction --no-tablespaces --result-file=hsaas.sql.backup hsaas
```

Do not run destructive restore commands against the only original database. Pause the worker, restore an isolated copy, check schema/history/counts/active assignments, then reconcile outbox rows with the original chain. Preserve signed bytes and signatures; do not rebuild unknown transactions casually. A lost-response row may already be on-chain.

Retry policy: inspect FAILED and attempts>=12 rows before any reset. A transport outage can resume the same saved transaction after fixing connectivity. A definitive Move failure requires a diagnosed cause, approval and a recorded new attempt; never change the event hash. Do not mark CONFIRMED manually. A fresh package/registry is a new deployment, not a way to hide conflicting commitments.

# 23 Annotation index and release boundary

|Marker|Meaning and purpose|Importance and failure if removed|
|S01|Environment-supplied initial administrator secret|Critical: shared default credentials allow takeover|
|S02|Separate bearer-only device security chain|Critical: a reader credential could become human authority|
|S03|Reload active role for existing sessions|High: revoked users retain privileged sessions|
|D01|Generated-column active uniqueness|Critical: duplicate active card/registration allocations|
|D02-D03|Atomic command result, state and audit writes|Critical: retries duplicate operations or partial commits diverge|
|D04|Versioned exact event bytes and hash|High: later verification cannot reproduce the original commitment|
|B01|Final server-side MRN validation|Critical: browser checkmarks can be forged or stale|
|B02|Authoritative state/category checks|Critical: wrong/unavailable cards can be assigned|
|U01|Stable key for unknown transport outcome|Critical: network retries repeat business mutations|
|U02|Ignore late scan responses|High: the wrong card/context is displayed as current|
|R01|Single-use actor/purpose/target-bound scan|Critical: stale/cross-operation evidence is accepted|
|R02|Card removal before another scan|High: one held card triggers multiple jobs|
|M01|Writer capability bound to registry|Critical: authority is usable against the wrong registry|
|M02|Same-event conflict rejection|Critical: earlier commitments can be replaced|
|W01|Expected chain identity check|Critical: proofs are sent to the wrong network|
|W02|Persist signed intent before execute|Critical: lost responses create uncontrolled new intents|
|W03|Success plus confirmation before Confirmed|Critical: a Move failure is reported as proof success|

The release boundary is deliberately explicit. This is a complete compact teaching-reference listing for the stated implementation, not a production-certified hospital system or every possible extension from the broader planning documents. Chapter 24 adds the later requested notification and escalation behavior to this reference. Lost-card replacement, NDEF provisioning, multiple counters, detailed historic exports, persistent distributed sessions, a real Hospital API and physical door integration require separately specified workflows and tests. Existing limitations are not hidden behind stubbed methods.

Before using real data: obtain hospital-approved forms and access policy, implement data retention and purge, separate migration/runtime database accounts, restrict network access, add rate limiting/body-size limits, complete audit/secret handling review, test browser/USB/Testnet integration, and record recovery evidence. Do not treat successful PDF generation as successful application integration.

## Official technical references

Spring Boot version/support baseline:
https://docs.spring.io/spring-boot/system-requirements.html

Spring Security CSRF behavior:
https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html

MySQL generated columns and constraints:
https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html

Java PC/SC transport:
https://docs.oracle.com/en/java/javase/21/docs/api/java.smartcardio/javax/smartcardio/package-summary.html

Sui table API and package onboarding:
https://docs.sui.io/references/framework/sui_sui/table
https://docs.sui.io/getting-started/onboarding/hello-world

Mysten client, manual signing, results and event type definitions:
https://sdk.mystenlabs.com/sui/clients/grpc
https://sdk.mystenlabs.com/sui/clients/executing
https://sdk.mystenlabs.com/sui/transactions/signing-and-execution
https://github.com/MystenLabs/ts-sdks/blob/main/packages/sui/src/client/types.ts

The companion English guideline contains the full source index and deployment/hardware discussion. Vendor facts were checked against these official references; application code and design tradeoffs are original reference choices for this project.

# 24 Approval updates, return reminders and overdue alerts

This chapter incorporates the later requested visitor notification flow. Apply the exact edits below after chapters 01-23. The message transport in this edition is explicitly MOCK: it records intended messages without contacting WhatsApp or logging the mobile number. That permits end-to-end business and timing tests while the hospital has not approved a real WhatsApp account, templates or data handling. The operational semantics are complete in mock mode; actual provider submission and delivery callbacks are a separate integration gate.

The visitor may receive two different updates. VERIFIED can trigger APPROVED, which has no pass number because no card has been issued. After issue, PASS_ISSUED includes the public assignment reference and saved due_at. Thirty minutes before the due time, a still-open assignment can trigger RETURN_REMINDER once. Staff see overdue assignments even when the visitor declined messaging.

## backend/src/main/resources/db/migration/V2__notifications.sql

```sql
CREATE TABLE notification_jobs (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 resource_id CHAR(36) NOT NULL,
 kind VARCHAR(25) NOT NULL,
 state VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 attempted_at TIMESTAMP(6) NULL,
 error_code VARCHAR(60),
 mock_text TEXT,
 UNIQUE KEY uq_message_intent (resource_id,kind),
 INDEX ix_message_ready (state,id),
 CHECK (kind IN ('APPROVED','PASS_ISSUED','RETURN_REMINDER')),
 CHECK (state IN ('PENDING','MOCK_SENT','UNKNOWN','SKIPPED'))
);
CREATE TABLE staff_followups (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 assignment_id CHAR(36) NOT NULL,
 actor VARCHAR(50) NOT NULL,
 action VARCHAR(20) NOT NULL,
 note VARCHAR(300) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);
```

## Change Store.register in Store.java

Immediately after `clean.put("purpose",value(b,"purpose",200));` insert the following complete block. Consent to mandatory information collection and optional WhatsApp updates are separate choices. The phone must be international E.164 style when optional WhatsApp is selected.

```java
  boolean wa="yes".equals(b.get("whatsappOptIn"));
  if (wa) require(clean.get("phone").matches("\\+[1-9][0-9]{7,14}"),
   "WHATSAPP_PHONE_FORMAT");
  clean.put("whatsappOptIn",Boolean.toString(wa));
```

## Change Registration in App.tsx

Inside the registration form, insert this checkbox before the existing required notice checkbox. It starts unchecked and has its own form field; a visitor can register without it.

```tsx
   <label className="check"><input type="checkbox"
    checked={form.whatsappOptIn==='yes'}
    onChange={e=>set({...form,whatsappOptIn:e.target.checked?'yes':'no'})}/>
    Send me WhatsApp approval, pass and return reminders.
    I can ask the counter to stop these messages.</label>
```

## Enable scheduling in App.java

Add this import and annotation to the existing App class:

```java
import org.springframework.scheduling.annotation.EnableScheduling;
// Add immediately before @SpringBootApplication:
@EnableScheduling
```

## backend/src/main/java/edu/upm/hsaas/Notifications.java

This complete service runs on one Backend instance in the reference deployment. It creates unique intent rows, selects one pending message, rechecks assignment state and records a mock send. Because it never hands a request to an external provider, MOCK_SENT is a local test outcome and must never be displayed as WhatsApp delivery.

```java
package edu.upm.hsaas;

import java.sql.Timestamp;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class Notifications {
 final JdbcTemplate db; final TransactionTemplate tx;
 final ZoneId zone=ZoneId.of("Asia/Kuala_Lumpur");
 public Notifications(JdbcTemplate db,TransactionTemplate tx) {
  this.db=db;this.tx=tx;
 }
 @Scheduled(fixedDelay=60000,initialDelay=5000)
 public void tick() {
  tx.executeWithoutResult(status -> {
   db.queryForObject("SELECT id FROM gate WHERE id=1 FOR UPDATE",Integer.class);
   // [N01] Approval contains no card or due time and is skipped after issue.
   db.update("""
    INSERT IGNORE INTO notification_jobs(resource_id,kind)
    SELECT r.id,'APPROVED' FROM registrations r
    WHERE r.state='VERIFIED'
     AND JSON_UNQUOTE(JSON_EXTRACT(r.data,'$.whatsappOptIn'))='true'
     AND NOT EXISTS (SELECT 1 FROM assignments a
      WHERE a.registration_id=r.id)
    """);
   db.update("""
    INSERT IGNORE INTO notification_jobs(resource_id,kind)
    SELECT a.id,'PASS_ISSUED' FROM assignments a
    JOIN registrations r ON r.id=a.registration_id
    WHERE JSON_UNQUOTE(JSON_EXTRACT(r.data,'$.whatsappOptIn'))='true'
    """);
   // [N02] UTC database clock; no reminder after recorded return.
   db.update("""
    INSERT IGNORE INTO notification_jobs(resource_id,kind)
    SELECT a.id,'RETURN_REMINDER' FROM assignments a
    JOIN registrations r ON r.id=a.registration_id
    WHERE a.returned_at IS NULL AND a.due_at>CURRENT_TIMESTAMP
     AND a.due_at<=DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 30 MINUTE)
     AND JSON_UNQUOTE(JSON_EXTRACT(r.data,'$.whatsappOptIn'))='true'
    """);
   var waiting=db.queryForList("""
    SELECT id,resource_id,kind FROM notification_jobs
    WHERE state='PENDING' ORDER BY id LIMIT 1
    """);
   if(waiting.isEmpty())return;
   var j=waiting.getFirst();
   String kind=(String)j.get("kind"),resource=(String)j.get("resource_id");
   if(kind.equals("APPROVED")) {
    var rows=db.queryForList("SELECT state FROM registrations WHERE id=?",resource);
    var issued=db.queryForList("SELECT id FROM assignments WHERE registration_id=?",resource);
    if(rows.isEmpty() || !"VERIFIED".equals(rows.getFirst().get("state"))
      || !issued.isEmpty()) {
     skip(j);return;
    }
    acceptMock(j,"Your visitor request "+resource+" is approved. "
     +"Please collect the pass at the counter. No pass is issued yet.");
    return;
   }
   var rows=db.queryForList("""
    SELECT a.id,a.due_at,a.returned_at FROM assignments a WHERE a.id=?
    """,resource);
   if(rows.isEmpty()){skip(j);return;}
   var assignment=rows.getFirst();
   if(kind.equals("PASS_ISSUED") && assignment.get("returned_at")!=null) {
    skip(j);return;
   }
   if(kind.equals("RETURN_REMINDER") && assignment.get("returned_at")!=null) {
    skip(j);return;
   }
   Instant due=((Timestamp)assignment.get("due_at")).toInstant();
   String local=DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a '(MYT, UTC+8)'")
    .withZone(zone).format(due);
   String pass="HSAAS-"+resource;
   String body=kind.equals("PASS_ISSUED")
    ? "Pass "+pass+" was issued. Return it to the counter by "+local+"."
    : "Reminder: return pass "+pass+" to the counter by "+local+".";
   acceptMock(j,body);
  });
 }
 void skip(Map<String,Object> j) {
  db.update("UPDATE notification_jobs SET state='SKIPPED' WHERE id=?",j.get("id"));
 }
 void acceptMock(Map<String,Object> j,String body) {
  // [N03] No mobile number or message body in application logs.
  db.update("""
   UPDATE notification_jobs SET state='MOCK_SENT',attempted_at=CURRENT_TIMESTAMP,
    mock_text=? WHERE id=?
   """,body,j.get("id"));
 }
 public Map<String,Object> overdue() {
  var rows=db.queryForList("""
   SELECT a.id AS pass_id,a.uid,a.due_at,
    TIMESTAMPDIFF(MINUTE,a.due_at,CURRENT_TIMESTAMP) AS minutes_late
   FROM assignments a WHERE a.returned_at IS NULL
    AND a.due_at<CURRENT_TIMESTAMP ORDER BY a.due_at LIMIT 100
   """);
  // [N04] Staff alert depends on open assignments, not message delivery.
  return Map.of("count",rows.size(),"items",rows);
 }
 public Map<String,Object> followup(String id,String actor,Map<String,String> b) {
  return tx.execute(status -> {
   db.queryForObject("SELECT id FROM gate WHERE id=1 FOR UPDATE",Integer.class);
   var a=db.queryForList("""
    SELECT id FROM assignments WHERE id=? AND returned_at IS NULL
     AND due_at<CURRENT_TIMESTAMP
    """,id);
   Store.require(!a.isEmpty(),"NOT_OVERDUE");
   String action=Store.value(b,"action",20),note=Store.value(b,"note",300);
   Store.require(Set.of("CONTACTED","ESCALATED","EXTENDED_PENDING")
    .contains(action),"BAD_FOLLOWUP_ACTION");
   db.update("""
    INSERT INTO staff_followups(assignment_id,actor,action,note)
    VALUES (?,?,?,?)
    """,id,actor,action,note);
   return Map.of("ok",true);
  });
 }
}
```

[N01] High: an approval notification can be queued only while the request is verified. The issue template is separate because pass reference and deadline exist only after issue.

[N02] Critical: one reminder intent per assignment and no reminder for a recorded return. There remains a short unavoidable race between a real provider submission and an in-person return; a production provider adapter should minimize that interval and avoid claiming a hard guarantee that no late message can ever arrive.

[N03] High: the current adapter is MOCK. For a real provider, create a separate `WhatsAppSender` with approved business account credentials and reviewed utility templates, store provider message ID, consume status callbacks and distinguish accepted, delivered, failed and unknown. Never equate an HTTP acceptance with delivery. Do not send raw card UID, MRN or ward in templates. WhatsApp's [messaging policy](https://whatsappbusiness.com/policy/) requires permission to contact the recipient and approved templates for business-initiated messages.

[N04] Critical: the counter staff alert works even if the visitor opted out, lacks WhatsApp or delivery failed. Staff follow-up records an action; it does not itself close the overdue assignment. A physical return closes it through the existing return command.

## Add staff endpoints to Api.java

Add `final Notifications notifications;` and change the constructor to `public Api(Store s,Notifications notifications) { this.s=s;this.notifications=notifications; }`. Add the following methods within the existing class:

```java
 @GetMapping("/api/staff/overdue") Object overdue() {
  return notifications.overdue();
 }
 @PostMapping("/api/staff/overdue/{id}/followup") Object followup(
  @PathVariable String id,@RequestBody Map<String,String> b,
  @RequestHeader("Idempotency-Key") String key,Authentication a) {
  return run(a,"followup:"+id,key,b,
   () -> notifications.followup(id,a.getName(),b));
 }
```

## Add staff alert to App.tsx

Add `const [overdue,setOverdue]=useState<Row>({count:0,items:[]});` with the other state declarations. Inside the `load()` function, before loading the selected tab, add `const late=await api('/staff/overdue');if(live)setOverdue(late);`. Immediately after the workspace `<nav>` add this panel:

```tsx
  {overdue.count>0&&<section className="notice" role="alert">
   <h2>{overdue.count} overdue pass(es)</h2>
   <p>Check the due time and contact the visitor through approved channels.</p>
   <Table rows={overdue.items} action={r=><Button onClick={()=>{
    const note=prompt('Record follow-up note');
    if(note)void action(()=>api(`/staff/overdue/${r.pass_id}/followup`,
     {action:'CONTACTED',note}));
   }}>Record follow-up</Button>}/>
  </section>}
```

For a multi-page staff dashboard, fetch `/api/staff/overdue` with its own five-second query even when Settings or Users is open. The compact UI refreshes the alert when tabs/actions refresh and while operational tabs poll. The alert count is capped to the first 100 rows in this reference; add a count query and pagination for larger deployments.

Acceptance tests: VERIFIED triggers an approval intent without pass/deadline; successful issue triggers PASS_ISSUED with the assignment reference and precise MYT date/time; a pending return triggers one reminder in the 30-minute window; returning before the window prevents that reminder; overdue rows alert staff regardless of opt-in; follow-up logs actor/action/note; no raw UID or patient fields appear in outbound text. The mock sender marks MOCK_SENT only. Obtain hospital approval, an official WhatsApp Business Platform account, approved templates and delivery callbacks before enabling actual messages.
