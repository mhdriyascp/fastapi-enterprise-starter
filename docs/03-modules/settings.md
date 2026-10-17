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
- **Dynamic Sort Order Priority (`sort_order`)**:
  - Indexed integer column `sort_order` enables deterministic priority ranking of configurations.
  - Endpoints default to ordering by `sort_order ASC`, falling back to `id ASC`.
  - Supports dynamic sorting via `?sort_by=sort_order&sort_order=asc|desc`.
  - Single updates accept `sort_order`, and bulk update `PATCH /api/v1/settings/bulk` accepts an atomic `sort_orders: {"key": 10}` dictionary.
- **RBAC Security & Administrator-Only Policy (Restricted by Default)**:
  - **Administrator-Only Access by Default**: All administrative system settings endpoints (`/api/v1/settings`, `/api/v1/settings/map`, `/api/v1/settings/bulk`, `/api/v1/settings/{identifier}`) enforce `require_admin()`. Only users with system administrative roles (`super_admin`, `admin`, `system_admin`) or the dedicated administrative permission `settings.manage` can access or modify platform configuration parameters.
  - **Permissions Hierarchy**:
    - `settings.manage`: Super-permission for full platform parameter governance and lifecycle operations. Assigned to `super_admin` and `admin` by default. Overrides granular read/update checks.
    - `settings.read`: Grants permission to view administrative configuration matrices, category groupings, and raw values. Restricted to administrative roles by default.
    - `settings.update`: Grants permission to patch and update individual parameters and execute bulk modifications. Restricted to administrative roles by default.
  - **Decoupled Public Endpoint**:
    - `GET /api/v1/settings/public`: Safely exposes non-sensitive branding and localization parameters (`company_name`, `default_timezone`, `default_locale`, `default_date_format`, `default_currency`) without authentication for guest views, login screen personalization, and client bootstrapping.
  - **Frontend UI State & Access Guard**:
    - The settings dashboard verifies administrative eligibility (`isAdmin` / `canEdit`). Non-administrative accounts encountering the settings page are presented with an enterprise Access Denied card explaining the restricted status and redirecting to the main dashboard.
    - An `Admin Restricted` badge and padlock icon in the header communicate policy enforcement.
- **Atomic Bulk Mutations**: `PATCH /api/v1/settings/bulk` allows updating multiple settings and their sort orders in a single database transaction.

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
| `general` | `default_page_size` | `15` | `integer`| **Yes** | Default records per page across listing views and data tables |
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
| `data_retention` | `permanent_delete_roles` | `["super_admin", "admin"]` | `array` | No | Roles authorized to permanently purge database records |
| `data_retention` | `soft_delete_only_for_non_admins` | `true` | `boolean` | No | Restricts non-administrative deletion actions strictly to soft-delete |
| `data_retention` | `permanent_delete_exceptions` | `[]` | `array` | No | Module or entity-specific hard-delete exceptions (e.g. `["notifications:hard"]`) |
| `data_retention` | `admin_view_all_statuses` | `true` | `boolean` | No | Enables platform administrators to view all statuses (active, inactive, deleted) on listings |
| `features` | `maintenance_mode` | `false` | `boolean`| **Yes** | Maintenance restriction flag |
| `features` | `allow_self_registration` | `false` | `boolean`| **Yes** | Self-serve onboarding flag |
| `features` | `multi_currency_enabled` | `true` | `boolean`| **Yes** | International multi-currency support |
| `features` | `show_theme_toggle_in_header` | `true` | `boolean`| **Yes** | Controls display of Appearance & Theme toggle in dashboard header |

---

## 3. REST API Endpoints

| Method | Endpoint | Access | Summary |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/settings/public` | Public (Unauthenticated) | Get non-sensitive configuration dictionary |
| `GET` | `/api/v1/settings` | Admin Only (`settings.read` / `settings.manage`) | List paginated settings with category filter & search |
| `GET` | `/api/v1/settings/map` | Admin Only (`settings.read` / `settings.manage`) | Get consolidated key-value mapping of all settings |
| `GET` | `/api/v1/settings/{identifier}` | Admin Only (`settings.read` / `settings.manage`) | Get single setting by ID, UUID, or key |
| `PATCH` | `/api/v1/settings/{identifier}` | Admin Only (`settings.update` / `settings.manage`) | Update single setting value and metadata |
| `PATCH` | `/api/v1/settings/bulk` | Admin Only (`settings.update` / `settings.manage`) | Atomically update multiple settings by key |
