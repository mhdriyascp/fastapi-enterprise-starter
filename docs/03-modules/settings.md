# 03. Modules — System Settings & Configurations

The System Settings domain governs platform-wide parameters, security policies, localization preferences, communication gateways, and feature toggles.

---

## 1. Architectural Highlights

- **Category-Partitioned Key-Value Store with JSONB**: Eliminates costly table schema migrations when introducing new feature flags, thresholds, or integration parameters.
- **Dual Identifier Strategy**:
  - Internal Primary Key: 64-bit autoincrement `BigInteger` (`id`).
  - External Public REST ID: RFC 9562 time-ordered `UUIDv7` (`public_id`).
  - Unique composite index on `(category, key)`.
- **Option C Standard**: Single-resource endpoints expose `{identifier}`, accepting internal integer `id`, external UUID `public_id`, or unique string `key`.
- **RBAC Security & Public Separation**:
  - `GET /api/v1/settings/public`: Safely exposes non-sensitive branding and localization parameters (`company_name`, `default_timezone`, `default_locale`, `default_date_format`, `default_currency`) without authentication for guest views and client bootstrapping.
  - Administrative endpoints require `settings.read` and `settings.update` permissions.
- **Atomic Bulk Mutations**: `PATCH /api/v1/settings/bulk` allows updating multiple settings in a single database transaction.

---

## 2. Default Configuration Matrix

| Category | Key | Production Default | Type | Public? | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `general` | `company_name` | `"Enterprise CRM Platform"` | `string` | **Yes** | Organization name displayed in headers and emails |
| `general` | `support_email` | `"support@enterprise.local"`| `string` | **Yes** | Platform support contact address |
| `general` | `default_timezone` | `"UTC"` | `string` | **Yes** | Default baseline IANA timezone |
| `general` | `default_locale` | `"en-US"` | `string` | **Yes** | Standard regional locale |
| `general` | `default_date_format` | `"YYYY-MM-DD"` | `string` | **Yes** | Default calendar date format |
| `general` | `default_time_format` | `"12h"` | `string` | **Yes** | Clock format (`12h` or `24h`) |
| `general` | `default_currency` | `"USD"` | `string` | **Yes** | Base currency code |
| `general` | `fiscal_year_start_month` | `1` | `integer`| No | Accounting start month (1 = Jan) |
| `security` | `password_min_length` | `12` | `integer`| No | Minimum credential character count |
| `security` | `password_require_uppercase` | `true` | `boolean`| No | Requires uppercase character |
| `security` | `password_require_numbers` | `true` | `boolean`| No | Requires numerical digits |
| `security` | `password_require_special` | `true` | `boolean`| No | Requires symbol/punctuation |
| `security` | `max_login_attempts` | `5` | `integer`| No | Consecutive failures before lockout |
| `security` | `lockout_duration_mins` | `15` | `integer`| No | Lockout cooldown period |
| `security` | `session_timeout_mins` | `30` | `integer`| No | Inactivity timeout before re-auth |
| `security` | `two_factor_policy` | `"optional"` | `string` | No | MFA policy (`disabled`, `optional`, `enforced`) |
| `security` | `ip_whitelist` | `[]` | `array` | No | Allowed CIDR blocks (empty = open) |
| `notifications` | `email_sender_name` | `"CRM System Dispatcher"`| `string` | No | Outbound transactional sender name |
| `notifications` | `email_sender_address`| `"no-reply@enterprise.local"`| `string` | No | Outbound transactional sender address |
| `notifications` | `enable_in_app_notifications`| `true` | `boolean`| No | In-app notification delivery |
| `notifications` | `enable_email_notifications` | `true` | `boolean`| No | Email notification delivery |
| `governance` | `audit_retention_days` | `365` | `integer`| No | SOC2 / ISO 27001 retention period |
| `governance` | `gdpr_anonymize_on_delete` | `true` | `boolean`| No | Scramble PII on user soft-delete |
| `governance` | `data_export_allowed_roles` | `["super_admin", "admin"]` | `array` | No | Roles authorized for mass export |
| `features` | `maintenance_mode` | `false` | `boolean`| **Yes** | Maintenance restriction flag |
| `features` | `allow_self_registration` | `false` | `boolean`| **Yes** | Self-serve onboarding flag |
| `features` | `multi_currency_enabled` | `true` | `boolean`| **Yes** | International multi-currency support |

---

## 3. REST API Endpoints

| Method | Endpoint | Access | Summary |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/settings/public` | Public (Unauthenticated) | Get non-sensitive configuration dictionary |
| `GET` | `/api/v1/settings` | RBAC `settings.read` | List paginated settings with category filter & search |
| `GET` | `/api/v1/settings/map` | RBAC `settings.read` | Get consolidated key-value mapping of all settings |
| `GET` | `/api/v1/settings/{identifier}` | RBAC `settings.read` | Get single setting by ID, UUID, or key |
| `PATCH` | `/api/v1/settings/{identifier}` | RBAC `settings.update` | Update single setting value and metadata |
| `PATCH` | `/api/v1/settings/bulk` | RBAC `settings.update` | Atomically update multiple settings by key |
