# Hostinger Remote Database & Next.js Runtime Verification Checklist

This checklist must be executed before initiating Phase 2 schema migrations and deployment.

---

## Part A: Hostinger Remote MySQL Database Verification

### 1. Enable Remote MySQL in hPanel
- [ ] Log in to **Hostinger hPanel** (`hpanel.hostinger.com`).
- [ ] Navigate to **Databases** -> **Remote MySQL**.
- [ ] In the **IP (IPv4 or IPv6)** field:
  - **For Cloudflare Hyperdrive**: Hyperdrive egress originates from Cloudflare's public IP ranges. Because Cloudflare publishes dynamic IP ranges, enter `%` (wildcard) ONLY IF paired with a strong 32+ character random password, OR configure specific CIDRs if dedicated egress is enabled.
  - **Security Mandate**: Never use generic passwords. Generate a cryptographically secure 40-character password.
- [ ] Select the specific quiz platform database from the dropdown.
- [ ] Click **Create** and verify the entry appears in the active remote MySQL table.

### 2. Verify Port 3306 & Network Reachability
Run the following connectivity probe from your terminal or staging machine:
```bash
# Test TCP handshake on port 3306
nc -zv <your-hostinger-mysql-hostname-or-ip> 3306
# Expected output: Connection to <ip> 3306 port [tcp/mysql] succeeded!
```
- [ ] Verified TCP port 3306 responds.

### 3. Verify Database Credentials & Privileges
```bash
# Test MySQL direct authentication
mysql -h <hostinger-mysql-host> -u <database-user> -p<database-password> -D <database-name> -e "SELECT VERSION(), @@character_set_database, @@collation_database;"
```
- [ ] Output confirms MySQL 8.0.x (or 5.7.x InnoDB).
- [ ] Output confirms `character_set_database = utf8mb4` and `collation_database = utf8mb4_unicode_ci` (required for Bengali / Bangla question text).
- [ ] Test table creation and drop to ensure the user has full `DDL` and `DML` privileges:
  ```sql
  CREATE TABLE _connectivity_test (id INT PRIMARY KEY, test_val VARCHAR(50));
  INSERT INTO _connectivity_test VALUES (1, 'Hyperdrive Handshake OK');
  SELECT * FROM _connectivity_test;
  DROP TABLE _connectivity_test;
  ```

### 4. Create Cloudflare Hyperdrive Configuration
Execute via Wrangler CLI:
```bash
npx wrangler hyperdrive create quiz-db-hyperdrive \
  --connection-string="mysql://<user>:<password>@<hostinger-mysql-host>:3306/<database-name>"
```
- [ ] Record the returned Hyperdrive configuration ID.
- [ ] Update `wrangler.jsonc` with `id: "<hyperdrive_id>"`.

---

## Part B: Hostinger Next.js Runtime Compatibility Checklist

### 1. Hostinger Hosting Plan Capability Assessment
Hostinger offers distinct tiers with very different runtime capabilities:

| Hosting Plan Type | Node.js Runtime Support | Next.js Server Features (SSR / API Routes) | Recommended Next.js Deployment Mode |
| :--- | :--- | :--- | :--- |
| **Shared Web / Premium / Business Hosting** | Limited / CloudLinux Node.js selector (via Passenger/cPanel) | Unstable / restricted ports, no persistent daemons | **Next.js Static Export (`output: 'export'`)** or deploy web portal to Cloudflare Pages / Hostinger VPS |
| **Cloud Hosting (Startup, Professional, Enterprise)** | Integrated Node.js daemon support | Supported with PM2 / systemd runner | **Next.js Standalone (`output: 'standalone'`)** |
| **Hostinger KVM VPS** | Full root Linux (Ubuntu 22.04 / 24.04 LTS) | 100% full Node.js 20+ runtime, PM2, Nginx reverse proxy | **Next.js Standalone (`output: 'standalone'`)** |

### 2. Next.js Runtime Decision Matrix
- [ ] **If Shared Hosting Plan**:
  - Configure `next.config.mjs`:
    ```javascript
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      output: 'export',
      images: { unoptimized: true },
      trailingSlash: true,
    };
    export default nextConfig;
    ```
  - The Admin UI runs entirely as a Single Page Application (SPA), calling `https://api.example.com/api/v1` over HTTPS with JWT Bearer tokens in headers.
  - Zero database credentials in Next.js bundle.
- [ ] **If Cloud / VPS Plan**:
  - Configure `output: 'standalone'` with Node.js 20 LTS managed by PM2 behind Nginx with Let's Encrypt SSL.
